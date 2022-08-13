import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { PeerRoom } from '../../services/PeerRoom'

interface RoomProps {
  peerRoom?: PeerRoom
}

export function Room({ peerRoom = new PeerRoom() }: RoomProps) {
  const params = useParams()

  const { roomId } = params

  useEffect(() => {
    if (roomId) {
      peerRoom.joinRoom(roomId)
    } else {
      console.error('roomId not specified')
    }

    return () => {
      peerRoom.leaveRoom()
    }
  }, [peerRoom, roomId])

  return <>Room ID: {roomId}</>
}
