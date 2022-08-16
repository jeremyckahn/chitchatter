import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import { usePeerRoom } from '../../hooks/usePeerRoom'
import { PeerRoom } from '../../services/PeerRoom'

enum PeerActions {
  MESSAGE = 'MESSAGE',
}

interface RoomProps {
  peerRoom: PeerRoom
  roomId: string
}

function Room({ peerRoom, roomId }: RoomProps) {
  const { makeAction } = peerRoom

  const [[sendMessage, receiveMessage]] = useState(() =>
    makeAction<string>(PeerActions.MESSAGE)
  )

  receiveMessage(message => {
    console.log(message)
  })

  return (
    <div>
      <Typography>Room ID: {roomId}</Typography>
      <Typography>
        Open this page in another tab and open the console.
      </Typography>
      <Button
        onClick={() => {
          sendMessage('Hello!')
        }}
        variant="contained"
      >
        Say hi
      </Button>
    </div>
  )
}

function RoomLoader() {
  const { roomId = '' } = useParams()

  const peerRoom = usePeerRoom({
    appId: `${process.env.REACT_APP_NAME}`,
    roomId,
  })

  if (peerRoom) {
    return <Room peerRoom={peerRoom} roomId={roomId} />
  } else {
    return <>Loading...</>
  }
}

export { RoomLoader as Room }
