import { describe, expect, it, vi } from 'vitest'

import { PeerAction } from 'core/models/network'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { ActionNamespace, PeerHookType } from 'core/transport/types'

/**
 * These tests drive `TrysteroTransport` against a stub of Trystero's `Room`.
 *
 * The real transport cannot be exercised in process — it wants WebRTC and a
 * tracker — but its handler bookkeeping can be, and that bookkeeping is where a
 * lost `onPeerJoin` cost PR #616 a round of red CI: the room is joined in the
 * constructor while handlers register later, so a peer that connects in between
 * has to be replayed, exactly once per hook type.
 */

interface StubAction {
  send: ReturnType<typeof vi.fn>
  onMessage: ((data: unknown, context: { peerId: string }) => void) | null
  onReceiveProgress: unknown
}

const stub = vi.hoisted(() => {
  const createStubRoom = () => {
    const peers: Record<string, unknown> = {}
    const actions = new Map<string, StubAction>()

    const room = {
      onPeerJoin: null as ((peerId: string) => void) | null,
      onPeerLeave: null as ((peerId: string) => void) | null,
      onPeerStream: null as ((...args: unknown[]) => void) | null,
      getPeers: () => peers,
      // Trystero allows one action per name per room, so a second call for the
      // same name is a bug in the caller rather than something to tolerate.
      makeAction: (name: string) => {
        if (actions.has(name)) {
          throw new Error(`Action ${name} was already made`)
        }

        const action: StubAction = {
          send: vi.fn(async () => []),
          onMessage: null,
          onReceiveProgress: null,
        }

        actions.set(name, action)

        return action
      },
      leave: vi.fn(),
      addStream: vi.fn(() => [Promise.resolve()]),
      removeStream: vi.fn(),
    }

    return {
      room,
      connectPeer: (peerId: string) => {
        peers[peerId] = {}
        room.onPeerJoin?.(peerId)
      },
      disconnectPeer: (peerId: string) => {
        delete peers[peerId]
        room.onPeerLeave?.(peerId)
      },
      receive: (name: string, data: unknown, peerId: string) => {
        actions.get(name)?.onMessage?.(data, { peerId })
      },
    }
  }

  const state: { current: ReturnType<typeof createStubRoom> } = {
    current: createStubRoom(),
  }

  return {
    createStubRoom,
    state,
    joinRoom: vi.fn(() => state.current.room),
  }
})

vi.mock('@trystero-p2p/torrent', () => ({ joinRoom: stub.joinRoom }))
vi.mock('trystero', () => ({ joinRoom: vi.fn() }))

const createTransport = () => {
  stub.state.current = stub.createStubRoom()

  // The config is only passed through to the mocked `joinRoom`.
  const transport = new TrysteroTransport(
    { appId: 'test' } as never,
    'test-room'
  )

  return { transport, trysteroRoom: stub.state.current }
}

const makeAction = (transport: TrysteroTransport) =>
  transport.makeAction<{ text: string }>(
    PeerAction.MESSAGE,
    ActionNamespace.DIRECT_MESSAGE
  )

const actionName = `${ActionNamespace.DIRECT_MESSAGE}.${PeerAction.MESSAGE}`

describe('TrysteroTransport', () => {
  it('announces a peer that connected before the handler was registered', () => {
    const { transport, trysteroRoom } = createTransport()

    // The room is joined during render; ChatRoom registers its handler in an
    // effect. A peer connecting in that window must not be lost.
    trysteroRoom.connectPeer('bob')

    const onJoin = vi.fn()

    transport.onPeerJoin(PeerHookType.NEW_PEER, onJoin)

    expect(onJoin).toHaveBeenCalledWith('bob')
  })

  it('announces each peer once per hook type however often it re-registers', () => {
    const { transport, trysteroRoom } = createTransport()

    trysteroRoom.connectPeer('bob')

    const onAudioJoin = vi.fn()

    // The media hooks register in their render bodies, so this happens on every
    // render. Re-announcing a connected peer there re-queues its media streams.
    transport.onPeerJoin(PeerHookType.AUDIO, onAudioJoin)
    transport.onPeerJoin(PeerHookType.AUDIO, onAudioJoin)
    transport.onPeerJoin(PeerHookType.AUDIO, onAudioJoin)

    expect(onAudioJoin).toHaveBeenCalledTimes(1)
  })

  it('does not replay a peer a registered handler was already told about', () => {
    const { transport, trysteroRoom } = createTransport()
    const onJoin = vi.fn()

    transport.onPeerJoin(PeerHookType.NEW_PEER, onJoin)
    trysteroRoom.connectPeer('bob')
    expect(onJoin).toHaveBeenCalledTimes(1)

    transport.onPeerJoin(PeerHookType.NEW_PEER, onJoin)

    expect(onJoin).toHaveBeenCalledTimes(1)
  })

  it('replays a connected peer to a hook type that registers later', () => {
    const { transport, trysteroRoom } = createTransport()

    transport.onPeerJoin(PeerHookType.NEW_PEER, vi.fn())
    trysteroRoom.connectPeer('bob')

    const onFileShareJoin = vi.fn()

    transport.onPeerJoin(PeerHookType.FILE_SHARE, onFileShareJoin)

    expect(onFileShareJoin).toHaveBeenCalledWith('bob')
  })

  it('announces a peer again once it has left and reconnected', () => {
    const { transport, trysteroRoom } = createTransport()
    const onJoin = vi.fn()

    transport.onPeerJoin(PeerHookType.NEW_PEER, onJoin)
    trysteroRoom.connectPeer('bob')
    trysteroRoom.disconnectPeer('bob')
    trysteroRoom.connectPeer('bob')

    expect(onJoin).toHaveBeenCalledTimes(2)
  })

  it('delivers one action to every receiver connected to it', () => {
    const { transport, trysteroRoom } = createTransport()

    // Several rooms share one action: a host keeps a direct-message room per
    // peer, and all of them listen on the `dm` namespace.
    const [, connectFirst] = makeAction(transport)
    const [, connectSecond] = makeAction(transport)
    const onFirst = vi.fn()
    const onSecond = vi.fn()

    connectFirst(onFirst)
    connectSecond(onSecond)

    trysteroRoom.receive(actionName, { text: 'hello' }, 'bob')

    expect(onFirst).toHaveBeenCalledWith({ text: 'hello' }, { peerId: 'bob' })
    expect(onSecond).toHaveBeenCalledWith({ text: 'hello' }, { peerId: 'bob' })
  })

  it('disconnects only the receiver that asked to be disconnected', () => {
    const { transport, trysteroRoom } = createTransport()

    const [, connectFirst, , disconnectFirst] = makeAction(transport)
    const [, connectSecond] = makeAction(transport)
    const onFirst = vi.fn()
    const onSecond = vi.fn()

    connectFirst(onFirst)
    connectSecond(onSecond)
    disconnectFirst()

    trysteroRoom.receive(actionName, { text: 'hello' }, 'bob')

    expect(onFirst).not.toHaveBeenCalled()
    expect(onSecond).toHaveBeenCalledTimes(1)
  })
})
