import { useEffect, useMemo } from 'react'

import { PeerRoom } from '../../services/PeerRoom'

interface PeerRoomProps {
  appId: string
  roomId: string
}

export function usePeerRoom({ appId, roomId }: PeerRoomProps) {
  const peerRoom = useMemo(() => {
    const peerRoom = new PeerRoom({ appId }, roomId)

    return peerRoom
  }, [appId, roomId])

  useEffect(() => {
    return () => {
      peerRoom.leaveRoom()
    }
  }, [appId, peerRoom, roomId])

  return peerRoom
}
