import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, useContext, useMemo, useState } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ShellContext } from 'contexts/ShellContext'
import { AudioChannelName, StreamType } from 'core/models/chat'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { AudioChannel } from 'models/media'

import { useRoomAudio } from './useRoomAudio'

/**
 * These tests drive `useRoomAudio` through a real `TrysteroTransport` over a
 * stub of Trystero's `Room`, so that a stream reaches the hook the way it does
 * in the app: fanned out by the transport to every `onPeerStream` handler,
 * with only the sender's `metadata` to say what it is.
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
const createAudioStream = () => ({ getAudioTracks: () => [{}] })

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

const renderRoomAudio = () => {
  stub.state.current = stub.createStubRoom()

  // The config is only passed through to the mocked `joinRoom`.
  const peerRoom = new TrysteroTransport({ appId: 'test' } as never, 'room')
  const trysteroRoom = stub.state.current
  const { Wrapper, channels } = createWrapper()

  renderHook(() => useRoomAudio({ peerRoom }), { wrapper: Wrapper })

  const receiveStream = (metadata: unknown, stream = createAudioStream()) => {
    act(() => {
      trysteroRoom.onPeerStream?.(stream, 'peer-1', metadata)
    })
  }

  return { channels, receiveStream }
}

describe('useRoomAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('plays a stream that identifies itself as a microphone', () => {
    const { channels, receiveStream } = renderRoomAudio()

    receiveStream({ type: StreamType.MICROPHONE })

    const audio = channels.current['peer-1']?.[AudioChannelName.MICROPHONE]

    expect(audio).toBeInstanceOf(HTMLAudioElement)
    expect(audio?.autoplay).toBe(true)
  })

  test.each([
    ['no metadata', undefined],
    ['null metadata', null],
    ['string metadata', 'MICROPHONE'],
    ['array metadata', [StreamType.MICROPHONE]],
    ['an object without a type', {}],
    ['a non-microphone type', { type: StreamType.WEBCAM }],
    ['an unknown type', { type: 'NOT_A_STREAM_TYPE' }],
  ])('does not play a stream with %s', (_description, metadata) => {
    const { channels, receiveStream } = renderRoomAudio()

    receiveStream(metadata)

    expect(channels.current).toEqual({})
  })

  test('does not play a microphone stream that carries no audio', () => {
    const { channels, receiveStream } = renderRoomAudio()

    receiveStream({ type: StreamType.MICROPHONE }, { getAudioTracks: () => [] })

    expect(channels.current).toEqual({})
  })
})
