import { useEffect, useMemo } from 'react'

import { PeerRoom } from '../../services/PeerRoom'

interface PeerRoomProps {
  appId: string
  roomId: string
}

export function usePeerRoom({ appId, roomId }: PeerRoomProps) {
  const peerRoom = useMemo(() => {
    return new PeerRoom({ appId })
  }, [appId])

  useEffect(() => {
    peerRoom.joinRoom(roomId)

    return () => {
      peerRoom.leaveRoom()
    }
  }, [appId, peerRoom, roomId])

  return {
    peerRoom,
  }
}
