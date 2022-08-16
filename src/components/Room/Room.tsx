import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import { usePeerRoom, usePeerRoomAction, PeerActions } from 'hooks/usePeerRoom'
import { PeerRoom } from 'services/PeerRoom'

interface RoomProps {
  peerRoom: PeerRoom
  roomId: string
}

function Room({ peerRoom, roomId }: RoomProps) {
  const [sendMessage, receiveMessage] = usePeerRoomAction<string>(
    peerRoom,
    PeerActions.MESSAGE
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
    appId: `${encodeURI(window.location.origin)}_${process.env.REACT_APP_NAME}`,
    roomId,
  })

  if (peerRoom) {
    return <Room peerRoom={peerRoom} roomId={roomId} />
  } else {
    return <>Loading...</>
  }
}

export { RoomLoader as Room }
