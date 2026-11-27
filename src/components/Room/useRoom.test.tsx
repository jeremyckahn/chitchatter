import { vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MutableRefObject, PropsWithChildren, useContext, useMemo } from 'react'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { ChatRoomRegistry } from 'core/chat/ChatRoomRegistry'
import { encryption } from 'core/crypto/Encryption'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { itemAt } from 'test-utils/itemAt'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { useRoom } from './useRoom'

vi.mock('../../lib/Audio')

const { trysteroLeave, hangingRescindAll, fileTransferServices } = vi.hoisted(
  () => ({
    trysteroLeave: vi.fn(),
    hangingRescindAll: { current: false },
    /** Every service built, in order, so a test can tell whose was destroyed. */
    fileTransferServices: [] as { destroy: () => Promise<void> }[],
  })
)

/**
 * A file transfer whose teardown can be made to never settle, which is how
 * WebTorrent behaves when a torrent will not destroy.
 */
vi.mock('services/FileTransfer', () => ({
  FileTransferService: class {
    constructor() {
      fileTransferServices.push(this)
    }

    destroy = vi.fn(async () => {})

    fileTransfer = {
      offer: vi.fn(async () => 'magnet:a'),
      rescind: vi.fn(async () => {}),
      rescindAll: vi.fn(() =>
        hangingRescindAll.current
          ? new Promise<void>(() => {})
          : Promise.resolve()
      ),
      isOffering: vi.fn(() => false),
    }
  },
}))

vi.mock('@trystero-p2p/torrent', () => ({
  selfId: 'self-peer-id',
  joinRoom: () => ({
    makeAction: () => ({
      send: vi.fn(async () => []),
      onMessage: null,
      onReceiveProgress: null,
    }),
    leave: trysteroLeave,
    getPeers: () => ({}),
    addStream: () => [Promise.resolve()],
    removeStream: () => {},
    onPeerJoin: null,
    onPeerLeave: null,
    onPeerStream: null,
  }),
}))

const userSettingsStub = userSettingsContextStubFactory({ userId: 'self' })

/**
 * The shell's defaults, with the mutable handles it owns made per-test so that
 * one room's transport cannot leak into the next. Every hook rendered with the
 * same wrapper shares them, the way a group room and its direct-message rooms
 * share the shell's.
 */
const createWrapper = () => {
  const setPassword = vi.fn()
  const transportRef: MutableRefObject<TrysteroTransport | null> = {
    current: null,
  }
  const chatRoomRegistry = new ChatRoomRegistry()
  const handles = { transportRef }

  const Wrapper = ({ children }: PropsWithChildren) => {
    const shellDefaults = useContext(ShellContext)

    const shellValue = useMemo(
      () => ({ ...shellDefaults, transportRef, chatRoomRegistry, setPassword }),
      [shellDefaults]
    )

    return (
      <SettingsContext.Provider value={userSettingsStub}>
        <ShellContext.Provider value={shellValue}>
          {children}
        </ShellContext.Provider>
      </SettingsContext.Provider>
    )
  }

  return { Wrapper, handles, setPassword }
}

const renderRoom = ({
  password,
  targetPeerId,
  wrapper = createWrapper(),
}: {
  password?: string
  targetPeerId?: string
  wrapper?: ReturnType<typeof createWrapper>
} = {}) => {
  const { Wrapper, handles, setPassword } = wrapper

  const rendered = renderHook(
    () =>
      useRoom(
        { appId: 'test', rtcConfig: { iceServers: [] }, password },
        {
          roomId: 'room-123',
          userId: 'self',
          publicKey: encryption.cryptoKeyStub,
          encryptionService: mockEncryptionService,
          targetPeerId,
        }
      ),
    { wrapper: Wrapper }
  )

  return { ...rendered, handles, setPassword }
}

describe('useRoom', () => {
  beforeEach(() => {
    trysteroLeave.mockClear()
    hangingRescindAll.current = false
    fileTransferServices.length = 0
  })

  test('shows the transcript whenever there is no video on screen', () => {
    const { result } = renderRoom()

    expect(result.current.showVideoDisplay).toBe(false)
    expect(result.current.roomContextValue.isShowingMessages).toBe(true)

    // Hiding the transcript is meaningless with nothing else to show, so the
    // request is ignored rather than leaving an empty room.
    act(() => {
      result.current.roomContextValue.setIsShowingMessages(false)
    })

    expect(result.current.roomContextValue.isShowingMessages).toBe(true)
  })

  test('forgets a hidden transcript once the video display goes away', () => {
    const { result } = renderRoom()

    act(() => {
      result.current.roomContextValue.setSelfVideoStream({} as MediaStream)
    })

    expect(result.current.showVideoDisplay).toBe(true)

    act(() => {
      result.current.roomContextValue.setIsShowingMessages(false)
    })

    expect(result.current.roomContextValue.isShowingMessages).toBe(false)

    act(() => {
      result.current.roomContextValue.setSelfVideoStream(null)
    })

    expect(result.current.roomContextValue.isShowingMessages).toBe(true)

    // The control that would unhide the transcript is not on screen while the
    // video display is gone, so a stale "hidden" would hide it again here with
    // no way back.
    act(() => {
      result.current.roomContextValue.setSelfVideoStream({} as MediaStream)
    })

    expect(result.current.roomContextValue.isShowingMessages).toBe(true)
  })

  test('leaves the room and releases the transport synchronously on unmount', () => {
    // The file transfer never lets go, standing in for a WebTorrent teardown
    // that hangs.
    hangingRescindAll.current = true

    const { unmount, handles } = renderRoom()

    expect(handles.transportRef.current).not.toBeNull()

    unmount()

    // Both assertions are about *when*, which is why nothing is awaited here.
    // Leaving the room behind an awaited teardown kept us joined and visible
    // to peers after the user navigated away — for good, if it never settles —
    // and left `transportRef` pointing at a doomed transport for the next room
    // to adopt in its `useState` initialiser.
    expect(trysteroLeave).toHaveBeenCalled()
    expect(handles.transportRef.current).toBeNull()
  })

  test('destroys the WebTorrent client once the room has left', async () => {
    const { unmount } = renderRoom()
    const service = itemAt(fileTransferServices, 0)

    expect(service.destroy).not.toHaveBeenCalled()

    unmount()

    // Without this, every room visited in a tab kept its own client alive,
    // tracker sockets and all, until the page was closed.
    await waitFor(() => expect(service.destroy).toHaveBeenCalledTimes(1))
  })

  test('a hanging rescind keeps the client but not the room', async () => {
    hangingRescindAll.current = true

    const { unmount } = renderRoom()
    const service = itemAt(fileTransferServices, 0)

    unmount()

    // The room is left at once regardless...
    expect(trysteroLeave).toHaveBeenCalled()

    // ...but the client is not destroyed underneath a rescind still using it.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(service.destroy).not.toHaveBeenCalled()
  })

  test("destroys a direct-message room's client with the group room, not with its dialog", async () => {
    const wrapper = createWrapper()
    const group = renderRoom({ wrapper })
    const firstDialog = renderRoom({ wrapper, targetPeerId: 'peer-1' })

    expect(fileTransferServices).toHaveLength(2)

    const directService = itemAt(fileTransferServices, 1)

    expect(
      firstDialog.result.current.roomContextValue.fileTransferService
    ).toBe(directService)

    // The conversation, and the file offers it made, outlive the dialog.
    firstDialog.unmount()

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(directService.destroy).not.toHaveBeenCalled()

    // Reopening it picks the conversation's own client back up rather than
    // starting another that nothing would ever destroy.
    const secondDialog = renderRoom({ wrapper, targetPeerId: 'peer-1' })

    expect(fileTransferServices).toHaveLength(2)
    expect(
      secondDialog.result.current.roomContextValue.fileTransferService
    ).toBe(directService)

    secondDialog.unmount()
    group.unmount()

    await waitFor(() => expect(directService.destroy).toHaveBeenCalledTimes(1))
    expect(itemAt(fileTransferServices, 0).destroy).toHaveBeenCalledTimes(1)
  })

  test('does not publish a password from a direct-message room', () => {
    // A peer's dialog renders a room with no password of its own, and every
    // peer in the list has one mounted. Publishing `undefined` from there
    // overwrote the private room's password, and the shell's share dialog is
    // built from that.
    const { setPassword, unmount } = renderRoom({ targetPeerId: 'peer-1' })

    expect(setPassword).not.toHaveBeenCalled()

    unmount()

    expect(setPassword).not.toHaveBeenCalled()
  })

  test('publishes the password of a group room', () => {
    const { setPassword } = renderRoom({ password: 'secret' })

    expect(setPassword).toHaveBeenCalledWith('secret')
  })
})
