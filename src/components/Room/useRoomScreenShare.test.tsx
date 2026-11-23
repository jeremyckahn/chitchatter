import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { ShellContext } from 'contexts/ShellContext'
import { AudioChannelName, StreamType } from 'core/models/chat'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { AudioChannel } from 'models/media'

import { useRoomScreenShare } from './useRoomScreenShare'

/**
 * Drives `useRoomScreenShare` through a real `TrysteroTransport` over a stub
 * of Trystero's `Room`, as `useRoomAudio.test.tsx` does, to cover the audio a
 * screen share carries: it plays through its own element, outside the
 * microphone path.
 */
const stub = vi.hoisted(() => {
  const createStubRoom = () => ({
    onPeerJoin: null as ((peerId: string) => void) | null,
    onPeerLeave: null as ((peerId: string) => void) | null,
    onPeerStream: null as
      | ((stream: unknown, peerId: string, metadata: unknown) => void)
      | null,
    getPeers: () => ({}),
    makeAction: () => ({
      send: async () => [],
      onMessage: null,
      onReceiveProgress: null,
    }),
    leave: () => {},
    addStream: () => [Promise.resolve()],
    removeStream: () => {},
  })

  const state: { current: ReturnType<typeof createStubRoom> } = {
    current: createStubRoom(),
  }

  return {
    createStubRoom,
    state,
    joinRoom: () => state.current,
  }
})

vi.mock('@trystero-p2p/torrent', () => ({
  joinRoom: stub.joinRoom,
  selfId: 'self-peer-id',
}))
vi.mock('trystero', () => ({ joinRoom: vi.fn() }))

/** Enough of a `MediaStream` for the hook to see that it carries audio. */
const createScreenStream = () => ({ getAudioTracks: () => [{}] })

/** The shell's real defaults, with `peerAudioChannels` held in real state. */
const createWrapper = () => {
  const channels: { current: Record<string, AudioChannel> } = { current: {} }

  const Wrapper = ({ children }: PropsWithChildren) => {
    const shellDefaults = useContext(ShellContext)
    const [peerAudioChannels, setPeerAudioChannels] = useState<
      Record<string, AudioChannel>
    >({})

    channels.current = peerAudioChannels

    const shellValue = useMemo(
      () => ({ ...shellDefaults, peerAudioChannels, setPeerAudioChannels }),
      [shellDefaults, peerAudioChannels]
    )

    return (
      <ShellContext.Provider value={shellValue}>
        {children}
      </ShellContext.Provider>
    )
  }

  return { Wrapper, channels }
}

const renderScreenShare = () => {
  stub.state.current = stub.createStubRoom()

  // The config is only passed through to the mocked `joinRoom`.
  const peerRoom = new TrysteroTransport({ appId: 'test' } as never, 'room')
  const trysteroRoom = stub.state.current
  const { Wrapper, channels } = createWrapper()

  renderHook(() => useRoomScreenShare({ peerRoom }), { wrapper: Wrapper })

  const receiveScreenShare = () => {
    act(() => {
      trysteroRoom.onPeerStream?.(createScreenStream(), 'peer-1', {
        type: StreamType.SCREEN_SHARE,
      })
    })
  }

  const getScreenAudio = () =>
    channels.current['peer-1']?.[AudioChannelName.SCREEN_SHARE]

  const disconnectPeer = () => {
    act(() => {
      trysteroRoom.onPeerLeave?.('peer-1')
    })
  }

  return { receiveScreenShare, getScreenAudio, disconnectPeer }
}

describe('useRoomScreenShare', () => {
  test('plays the audio of a screen share, starting muted', () => {
    const { receiveScreenShare, getScreenAudio } = renderScreenShare()

    receiveScreenShare()

    const audio = getScreenAudio()

    expect(audio).toBeInstanceOf(HTMLAudioElement)
    expect(audio?.autoplay).toBe(true)
    // Unmuted by `useUnlistedPeerAudioMute` once the peer is listed.
    expect(audio?.muted).toBe(true)
  })

  test('silences the previous screen audio when a peer shares its screen again', () => {
    const { receiveScreenShare, getScreenAudio } = renderScreenShare()

    receiveScreenShare()

    const first = getScreenAudio()

    if (!first) throw new Error('The first screen share was not played')

    // As if the peer had been listed and the mute hook had released it.
    first.muted = false
    const pause = vi.spyOn(first, 'pause').mockImplementation(() => {})

    receiveScreenShare()

    expect(getScreenAudio()).not.toBe(first)
    expect(first.muted).toBe(true)
    expect(pause).toHaveBeenCalled()
    expect(first.srcObject).toBeNull()
  })

  test('releases the screen audio of a peer that leaves', () => {
    const { receiveScreenShare, getScreenAudio, disconnectPeer } =
      renderScreenShare()

    receiveScreenShare()

    const audio = getScreenAudio()

    if (!audio) throw new Error('The screen share was not played')

    audio.muted = false
    const pause = vi.spyOn(audio, 'pause').mockImplementation(() => {})

    disconnectPeer()

    expect(getScreenAudio()).toBeUndefined()
    expect(audio.muted).toBe(true)
    expect(pause).toHaveBeenCalled()
    expect(audio.srcObject).toBeNull()
  })
})
