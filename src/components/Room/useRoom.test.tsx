import { vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo, useRef, useState } from 'react'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { ChatRoomRegistry } from 'core/chat/ChatRoomRegistry'
import { encryption } from 'core/crypto/Encryption'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { useRoom } from './useRoom'

vi.mock('../../lib/Audio')

vi.mock('@trystero-p2p/torrent', () => ({
  joinRoom: () => ({
    makeAction: () => ({
      send: vi.fn(async () => []),
      onMessage: null,
      onReceiveProgress: null,
    }),
    leave: () => {},
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
 */
const Wrapper = ({ children }: PropsWithChildren) => {
  const shellDefaults = useContext(ShellContext)
  const transportRef = useRef<TrysteroTransport | null>(null)
  const [chatRoomRegistry] = useState(() => new ChatRoomRegistry())

  const shellValue = useMemo(
    () => ({ ...shellDefaults, transportRef, chatRoomRegistry }),
    [shellDefaults, chatRoomRegistry]
  )

  return (
    <SettingsContext.Provider value={userSettingsStub}>
      <ShellContext.Provider value={shellValue}>
        {children}
      </ShellContext.Provider>
    </SettingsContext.Provider>
  )
}

const renderRoom = () =>
  renderHook(
    () =>
      useRoom(
        { appId: 'test', rtcConfig: { iceServers: [] } },
        {
          roomId: 'room-123',
          userId: 'self',
          publicKey: encryption.cryptoKeyStub,
          encryptionService: mockEncryptionService,
        }
      ),
    { wrapper: Wrapper }
  )

describe('useRoom', () => {
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
})
