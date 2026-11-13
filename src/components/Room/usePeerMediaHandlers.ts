import { useEffect, useRef } from 'react'

import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { PeerHookType, PeerStreamType } from 'core/transport/types'

export type PeerStreamHandler = Parameters<TrysteroTransport['onPeerStream']>[1]

interface UsePeerMediaHandlersConfig {
  peerRoom: Pick<
    TrysteroTransport,
    'onPeerJoin' | 'onPeerLeave' | 'onPeerStream'
  >
  peerHookType: PeerHookType
  peerStreamType: PeerStreamType
  onPeerJoin: (peerId: string) => void
  onPeerLeave: (peerId: string) => void
  onPeerStream: PeerStreamHandler
}

/**
 * Registers a media hook's peer join, leave and stream handlers with the
 * transport once, in an effect, and unregisters them on unmount.
 *
 * The handlers close over state that changes between renders, so the transport
 * is given thin wrappers that call whichever handlers the latest render
 * supplied. Registering the handlers directly would mean touching the
 * transport during render, which React may discard or repeat.
 */
export const usePeerMediaHandlers = ({
  peerRoom,
  peerHookType,
  peerStreamType,
  onPeerJoin,
  onPeerLeave,
  onPeerStream,
}: UsePeerMediaHandlersConfig) => {
  const latestHandlers = useRef({ onPeerJoin, onPeerLeave, onPeerStream })

  // Declared before the registering effect so that the transport's replay of
  // already-connected peers, which runs during registration, reaches the
  // current handlers.
  useEffect(() => {
    latestHandlers.current = { onPeerJoin, onPeerLeave, onPeerStream }
  })

  useEffect(() => {
    const unregisterJoin = peerRoom.onPeerJoin(peerHookType, peerId =>
      latestHandlers.current.onPeerJoin(peerId)
    )

    const unregisterLeave = peerRoom.onPeerLeave(peerHookType, peerId =>
      latestHandlers.current.onPeerLeave(peerId)
    )

    const unregisterStream = peerRoom.onPeerStream(peerStreamType, (...args) =>
      latestHandlers.current.onPeerStream(...args)
    )

    return () => {
      unregisterJoin()
      unregisterLeave()
      unregisterStream()
    }
  }, [peerRoom, peerHookType, peerStreamType])
}
