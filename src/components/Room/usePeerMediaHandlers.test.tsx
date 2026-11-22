import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { PeerHookType, PeerStreamType } from 'core/transport/types'

import { usePeerMediaHandlers } from './usePeerMediaHandlers'

type StubPeerRoom = Pick<
  TrysteroTransport,
  'onPeerJoin' | 'onPeerLeave' | 'onPeerStream'
>

const createPeerRoom = () => {
  const unregisterJoin = vi.fn()
  const unregisterLeave = vi.fn()
  const unregisterStream = vi.fn()

  const peerRoom = {
    onPeerJoin: vi.fn<StubPeerRoom['onPeerJoin']>(() => unregisterJoin),
    onPeerLeave: vi.fn<StubPeerRoom['onPeerLeave']>(() => unregisterLeave),
    onPeerStream: vi.fn<StubPeerRoom['onPeerStream']>(() => unregisterStream),
  } satisfies StubPeerRoom

  return { peerRoom, unregisterJoin, unregisterLeave, unregisterStream }
}

const createProps = (peerRoom: StubPeerRoom) => ({
  peerRoom,
  peerHookType: PeerHookType.AUDIO,
  peerStreamType: PeerStreamType.AUDIO,
  onPeerJoin: vi.fn(),
  onPeerLeave: vi.fn(),
  onPeerStream: vi.fn(),
})

describe('usePeerMediaHandlers', () => {
  it('registers each handler once, however often the host re-renders', () => {
    const { peerRoom } = createPeerRoom()

    const { rerender } = renderHook(props => usePeerMediaHandlers(props), {
      initialProps: createProps(peerRoom),
    })

    rerender(createProps(peerRoom))
    rerender(createProps(peerRoom))

    expect(peerRoom.onPeerJoin).toHaveBeenCalledTimes(1)
    expect(peerRoom.onPeerLeave).toHaveBeenCalledTimes(1)
    expect(peerRoom.onPeerStream).toHaveBeenCalledTimes(1)
  })

  it('registers under the hook and stream types it was given', () => {
    const { peerRoom } = createPeerRoom()

    renderHook(() =>
      usePeerMediaHandlers({
        ...createProps(peerRoom),
        peerHookType: PeerHookType.SCREEN,
        peerStreamType: PeerStreamType.SCREEN,
      })
    )

    expect(peerRoom.onPeerJoin).toHaveBeenCalledWith(
      PeerHookType.SCREEN,
      expect.any(Function)
    )
    expect(peerRoom.onPeerLeave).toHaveBeenCalledWith(
      PeerHookType.SCREEN,
      expect.any(Function)
    )
    expect(peerRoom.onPeerStream).toHaveBeenCalledWith(
      PeerStreamType.SCREEN,
      expect.any(Function)
    )
  })

  it('calls the handlers from the latest render, not the first', () => {
    const { peerRoom } = createPeerRoom()
    const first = createProps(peerRoom)
    const second = createProps(peerRoom)

    const { rerender } = renderHook(props => usePeerMediaHandlers(props), {
      initialProps: first,
    })

    rerender(second)

    const [, registeredJoin] = peerRoom.onPeerJoin.mock.calls[0]
    const [, registeredLeave] = peerRoom.onPeerLeave.mock.calls[0]

    registeredJoin('bob')
    registeredLeave('bob')

    expect(second.onPeerJoin).toHaveBeenCalledWith('bob')
    expect(second.onPeerLeave).toHaveBeenCalledWith('bob')
    expect(first.onPeerJoin).not.toHaveBeenCalled()
    expect(first.onPeerLeave).not.toHaveBeenCalled()
  })

  it('unregisters every handler on unmount', () => {
    const { peerRoom, unregisterJoin, unregisterLeave, unregisterStream } =
      createPeerRoom()

    const { unmount } = renderHook(() =>
      usePeerMediaHandlers(createProps(peerRoom))
    )

    expect(unregisterJoin).not.toHaveBeenCalled()

    unmount()

    expect(unregisterJoin).toHaveBeenCalledTimes(1)
    expect(unregisterLeave).toHaveBeenCalledTimes(1)
    expect(unregisterStream).toHaveBeenCalledTimes(1)
  })

  it('moves its handlers over when the room changes', () => {
    const first = createPeerRoom()
    const second = createPeerRoom()

    const { rerender } = renderHook(props => usePeerMediaHandlers(props), {
      initialProps: createProps(first.peerRoom),
    })

    rerender(createProps(second.peerRoom))

    expect(first.unregisterJoin).toHaveBeenCalledTimes(1)
    expect(second.peerRoom.onPeerJoin).toHaveBeenCalledTimes(1)
  })
})
