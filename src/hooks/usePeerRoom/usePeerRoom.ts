import { useEffect, useState } from 'react'

import { getPeerRoom } from 'services/PeerRoom'

interface UsePeerRoomProps {
  appId: string
  roomId: string
}

export function usePeerRoom({ appId, roomId }: UsePeerRoomProps) {
  const [peerRoom, setPeerRoom] = useState(getPeerRoom({ appId }, roomId))

  useEffect(() => {
    setPeerRoom(getPeerRoom({ appId }, roomId))
  }, [appId, roomId])

  return peerRoom
}
