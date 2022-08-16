import { useEffect, useState } from 'react'

import { PeerRoom, getPeerRoom } from 'services/PeerRoom'

interface UsePeerRoomProps {
  appId: string
  roomId: string
}

export function usePeerRoom({ appId, roomId }: UsePeerRoomProps) {
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
