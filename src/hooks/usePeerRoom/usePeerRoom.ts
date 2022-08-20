import { useEffect, useState } from 'react'
import { RoomConfig } from 'trystero'

import { getPeerRoom } from 'services/PeerRoom'

export function usePeerRoom(roomConfig: RoomConfig, roomId: string) {
  const { appId } = roomConfig
  const [peerRoom, setPeerRoom] = useState(getPeerRoom(roomConfig, roomId))

  useEffect(() => {
    setPeerRoom(getPeerRoom({ appId }, roomId))
  }, [appId, roomId])

  return peerRoom
}
