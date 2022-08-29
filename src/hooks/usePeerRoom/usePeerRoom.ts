import { useEffect, useState } from 'react'
import { RoomConfig } from 'trystero'

import { PeerRoom } from 'services/PeerRoom'

export function usePeerRoom(roomConfig: RoomConfig, roomId: string) {
  const [peerRoom] = useState(() => new PeerRoom(roomConfig, roomId))

  useEffect(() => {
    return () => {
      peerRoom.leaveRoom()
    }
  }, [peerRoom])

  return peerRoom
}
