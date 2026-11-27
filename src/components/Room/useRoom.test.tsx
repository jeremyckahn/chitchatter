import { vi } from 'vitest'
import { act, render, renderHook } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo, useRef, useState } from 'react'

import { RoomFileTransferContext } from 'contexts/RoomFileTransferContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { ChatRoomRegistry } from 'core/chat/ChatRoomRegistry'
import { encryption } from 'core/crypto/Encryption'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { FileTransferService } from 'services/FileTransfer'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'
import { itemAt } from 'test-utils/itemAt'
import { withoutUncaughtErrorReports } from 'test-utils/withoutUncaughtErrorReports'

import { useRoom } from './useRoom'

vi.mock('../../lib/Audio')

const { trysteroLeave, hangingRescindAll } = vi.hoisted(() => ({
  trysteroLeave: vi.fn(),
  hangingRescindAll: { current: false },
}))

/**
 * A file transfer whose teardown can be made to never settle, which is how
 * WebTorrent behaves when a torrent will not destroy.
 */
vi.mock('services/FileTransfer', () => ({
  FileTransferService: class {
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
 * one room's transport cannot leak into the next.
 *
 * `groupFileTransferService` is what `Shell` provides around the peer list,
 * which is where a direct-message room is rendered.
 */
const createWrapper = (
  groupFileTransferService: FileTransferService | null = null
) => {
  const setPassword = vi.fn()
  const registerGroupRoom = vi.fn()
  const handles: { transportRef: { current: TrysteroTransport | null } } = {
    transportRef: { current: null },
  }

  const Wrapper = ({ children }: PropsWithChildren) => {
    const shellDefaults = useContext(ShellContext)
    const transportRef = useRef<TrysteroTransport | null>(null)
    const [chatRoomRegistry] = useState(() => new ChatRoomRegistry())

    handles.transportRef = transportRef

    const shellValue = useMemo(
      () => ({
        ...shellDefaults,
        transportRef,
        chatRoomRegistry,
        setPassword,
        registerGroupRoom,
      }),
      [shellDefaults, chatRoomRegistry]
    )

    return (
      <SettingsContext.Provider value={userSettingsStub}>
        <ShellContext.Provider value={shellValue}>
          <RoomFileTransferContext.Provider value={groupFileTransferService}>
            {children}
          </RoomFileTransferContext.Provider>
        </ShellContext.Provider>
      </SettingsContext.Provider>
    )
  }

  return { Wrapper, handles, setPassword, registerGroupRoom }
}

const renderRoom = ({
  password,
  targetPeerId,
  groupFileTransferService,
}: {
  password?: string
  targetPeerId?: string
  groupFileTransferService?: FileTransferService
} = {}) => {
  const { Wrapper, handles, setPassword, registerGroupRoom } = createWrapper(
    groupFileTransferService
  )

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

  return { ...rendered, handles, setPassword, registerGroupRoom }
}

describe('useRoom', () => {
  beforeEach(() => {
    trysteroLeave.mockClear()
    hangingRescindAll.current = false
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

  test('does not publish a password from a direct-message room', () => {
    // A peer's dialog renders a room with no password of its own, and every
    // peer in the list has one mounted. Publishing `undefined` from there
    // overwrote the private room's password, and the shell's share dialog is
    // built from that.
    const { setPassword, unmount } = renderRoom({
      targetPeerId: 'peer-1',
      groupFileTransferService: new FileTransferService({}),
    })

    expect(setPassword).not.toHaveBeenCalled()

    unmount()

    expect(setPassword).not.toHaveBeenCalled()
  })

  test('publishes the password of a group room', () => {
    const { setPassword } = renderRoom({ password: 'secret' })

    expect(setPassword).toHaveBeenCalledWith('secret')
  })

  describe('file transfer', () => {
    // Regression test for https://github.com/jeremyckahn/chitchatter/issues/680:
    // the peer list is rendered by the shell, outside this room, and has to
    // download the room's offers through the client the room seeds through.
    test('registers the group room together with the service it seeds through', async () => {
      const { result, registerGroupRoom, unmount } = renderRoom()
      const { chatRoom, fileTransferService } = result.current

      expect(registerGroupRoom).toHaveBeenCalledWith({
        chatRoom,
        fileTransferService,
      })

      await act(async () => {
        await chatRoom.offerFiles([
          { name: 'doc.pdf', type: 'application/pdf', size: 10 },
        ])
      })

      // The instance registered is the one the room's adapters use.
      expect(fileTransferService.fileTransfer.offer).toHaveBeenCalled()

      unmount()

      expect(registerGroupRoom).toHaveBeenLastCalledWith(null)
    })

    // A DM room used to build a WebTorrent client of its own, which nothing
    // ever rescinded: only the group room's `leave()` calls `rescindAll`. It
    // shares the group room's now that a DM room's eviction can no longer stop
    // a torrent it did not send itself (see the core's "across rooms sharing
    // one file transfer" tests).
    test("a direct-message room adopts the group room's service", async () => {
      const groupFileTransferService = new FileTransferService({})
      const { result, registerGroupRoom } = renderRoom({
        targetPeerId: 'peer-1',
        groupFileTransferService,
      })

      expect(result.current.fileTransferService).toBe(groupFileTransferService)

      await act(async () => {
        await result.current.chatRoom.offerFiles([
          { name: 'doc.pdf', type: 'application/pdf', size: 10 },
        ])
      })

      // The room offers through the group's client, so the group room's
      // `rescindAll` on leave ends what it seeds.
      expect(groupFileTransferService.fileTransfer.offer).toHaveBeenCalled()

      // Only the group room is published to the shell.
      expect(registerGroupRoom).not.toHaveBeenCalled()
    })

    // A peer that leaves and rejoins remounts its DM `Room`, which reuses the
    // conversation's `ChatRoom` from the registry. A remount that built a new
    // service would hand components (inline media downloads) a client other
    // than the one that `ChatRoom` offers and rescinds through.
    test('a remounted direct-message room is bound to the service its reused ChatRoom offers through', async () => {
      const groupFileTransferService = new FileTransferService({})
      const { Wrapper } = createWrapper(groupFileTransferService)
      const mounts: ReturnType<typeof useRoom>[] = []

      const DirectMessageRoom = () => {
        mounts.push(
          useRoom(
            { appId: 'test', rtcConfig: { iceServers: [] } },
            {
              roomId: 'room-123',
              userId: 'self',
              publicKey: encryption.cryptoKeyStub,
              encryptionService: mockEncryptionService,
              targetPeerId: 'peer-1',
            }
          )
        )

        return null
      }

      const renderTree = (isMounted: boolean) => (
        <Wrapper>{isMounted ? <DirectMessageRoom /> : null}</Wrapper>
      )

      const { rerender } = render(renderTree(true))
      const first = itemAt(mounts, mounts.length - 1)

      rerender(renderTree(false))
      rerender(renderTree(true))

      const second = itemAt(mounts, mounts.length - 1)

      expect(second.chatRoom).toBe(first.chatRoom)
      expect(second.fileTransferService).toBe(groupFileTransferService)

      await act(async () => {
        await second.chatRoom.offerFiles([
          { name: 'doc.pdf', type: 'application/pdf', size: 10 },
        ])
      })

      expect(second.fileTransferService.fileTransfer.offer).toHaveBeenCalled()
    })

    test("a direct-message room refuses to render outside the group room's service", () => {
      expect(() =>
        withoutUncaughtErrorReports(() =>
          renderRoom({ targetPeerId: 'peer-1' })
        )
      ).toThrow(/outside the group room's RoomFileTransferContext/)
    })

    test('a group room builds its own service rather than adopting one', () => {
      const unrelatedFileTransferService = new FileTransferService({})
      const { result } = renderRoom({
        groupFileTransferService: unrelatedFileTransferService,
      })

      expect(result.current.fileTransferService).not.toBe(
        unrelatedFileTransferService
      )
    })
  })
})
