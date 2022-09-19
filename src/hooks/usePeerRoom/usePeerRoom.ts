import { useEffect, useState } from 'react'
import { BaseRoomConfig } from 'trystero'
import { TorrentRoomConfig } from 'trystero/torrent'

import { PeerRoom } from 'services/PeerRoom'

export function usePeerRoom(
  roomConfig: BaseRoomConfig & TorrentRoomConfig,
  roomId: string
) {
  const [peerRoom] = useState(() => new PeerRoom(roomConfig, roomId))

  useEffect(() => {
    return () => {
      peerRoom.leaveRoom()
    }
  }, [peerRoom])

  return peerRoom
}
