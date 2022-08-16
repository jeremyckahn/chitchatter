import { useEffect, useState } from 'react'

import { PeerRoom, getPeerRoom } from '../../services/PeerRoom'

interface PeerRoomProps {
  appId: string
  roomId: string
}

export function usePeerRoom({ appId, roomId }: PeerRoomProps) {
  const [peerRoom, setPeerRoom] = useState<PeerRoom | null>(null)

  useEffect(() => {
    ;(async () => {
      setPeerRoom(await getPeerRoom({ appId }, roomId))
    })()
  }, [appId, roomId])

  useEffect(() => {
    return () => {
      peerRoom?.leaveRoom()
    }
  }, [peerRoom])

  return peerRoom
}
