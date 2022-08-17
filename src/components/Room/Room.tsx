import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import { usePeerRoom, usePeerRoomAction, PeerActions } from 'hooks/usePeerRoom'

export function Room() {
  const { roomId = '' } = useParams()

  const peerRoom = usePeerRoom({
    appId: `${encodeURI(window.location.origin)}_${process.env.REACT_APP_NAME}`,
    roomId,
  })

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
