import { describe, expect, it, vi } from 'vitest'

import { PeerAction } from 'core/models/network'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import { ActionNamespace, PeerHookType } from 'core/transport/types'

interface Greeting extends Record<string, any> {
  text: string
}

const makeAction = (transport: InMemoryTransport) =>
  transport.makeAction<Greeting>(PeerAction.MESSAGE, ActionNamespace.GROUP)

describe('InMemoryTransport', () => {
  it('broadcasts an action to every other peer but not to the sender', async () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')
    const bob = new InMemoryTransport(network, 'bob')
    const carol = new InMemoryTransport(network, 'carol')

    const [send] = makeAction(alice)
    const [, connectAlice] = makeAction(alice)
    const [, connectBob] = makeAction(bob)
    const [, connectCarol] = makeAction(carol)

    const onAlice = vi.fn()
    const onBob = vi.fn()
    const onCarol = vi.fn()

    connectAlice(onAlice)
    connectBob(onBob)
    connectCarol(onCarol)

    await send({ text: 'hello' })

    expect(onBob).toHaveBeenCalledWith({ text: 'hello' }, { peerId: 'alice' })
    expect(onCarol).toHaveBeenCalledWith({ text: 'hello' }, { peerId: 'alice' })
    expect(onAlice).not.toHaveBeenCalled()
  })

  it('delivers only to the named peer when a target is given', async () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')
    const bob = new InMemoryTransport(network, 'bob')
    const carol = new InMemoryTransport(network, 'carol')

    const [send] = makeAction(alice)
    const [, connectBob] = makeAction(bob)
    const [, connectCarol] = makeAction(carol)

    const onBob = vi.fn()
    const onCarol = vi.fn()

    connectBob(onBob)
    connectCarol(onCarol)

    await send({ text: 'just for you' }, { target: 'bob' })

    expect(onBob).toHaveBeenCalledTimes(1)
    expect(onCarol).not.toHaveBeenCalled()
  })

  it('memoizes an action so repeated makeAction calls share one receiver slot', () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')

    expect(makeAction(alice)).toBe(makeAction(alice))
  })

  it('announces existing peers to a joiner and the joiner to existing peers', () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')

    const aliceSawJoin = vi.fn()

    alice.onPeerJoin(PeerHookType.NEW_PEER, aliceSawJoin)

    const bob = new InMemoryTransport(network, 'bob')
    const bobSawJoin = vi.fn()

    bob.onPeerJoin(PeerHookType.NEW_PEER, bobSawJoin)
    new InMemoryTransport(network, 'carol')

    expect(aliceSawJoin).toHaveBeenCalledWith('bob')
    expect(aliceSawJoin).toHaveBeenCalledWith('carol')
    expect(bobSawJoin).toHaveBeenCalledWith('carol')
  })

  it('fans a join out to every registered hook type', () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')

    const chat = vi.fn()
    const fileShare = vi.fn()

    alice.onPeerJoin(PeerHookType.NEW_PEER, chat)
    alice.onPeerJoin(PeerHookType.FILE_SHARE, fileShare)

    new InMemoryTransport(network, 'bob')

    expect(chat).toHaveBeenCalledWith('bob')
    expect(fileShare).toHaveBeenCalledWith('bob')
  })

  it('notifies remaining peers on leave and stops delivering to the leaver', async () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')
    const bob = new InMemoryTransport(network, 'bob')

    const aliceSawLeave = vi.fn()
    const onBob = vi.fn()

    alice.onPeerLeave(PeerHookType.NEW_PEER, aliceSawLeave)

    const [, connectBob] = makeAction(bob)

    connectBob(onBob)

    bob.leaveRoom()

    const [send] = makeAction(alice)

    await send({ text: 'anyone there?' })

    expect(aliceSawLeave).toHaveBeenCalledWith('bob')
    expect(onBob).not.toHaveBeenCalled()
    expect(alice.getPeers()).toEqual([])
  })

  it('stops delivering to a disconnected receiver and resumes on reconnect', async () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')
    const bob = new InMemoryTransport(network, 'bob')

    const [send] = makeAction(alice)
    const [, connectBob, , disconnectBob] = makeAction(bob)
    const onBob = vi.fn()

    connectBob(onBob)
    disconnectBob()
    await send({ text: 'ignored' })
    expect(onBob).not.toHaveBeenCalled()

    connectBob(onBob)
    await send({ text: 'heard' })
    expect(onBob).toHaveBeenCalledWith({ text: 'heard' }, { peerId: 'alice' })
  })

  it('reports peers excluding self', () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')

    new InMemoryTransport(network, 'bob')

    expect(alice.getPeers()).toEqual(['bob'])
  })

  it('reports no connection types, since there is no ICE in process', async () => {
    const network = createInMemoryNetwork()
    const alice = new InMemoryTransport(network, 'alice')

    await expect(alice.getPeerConnectionTypes()).resolves.toEqual({})
  })
})
