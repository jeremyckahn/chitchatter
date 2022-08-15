import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import { usePeerRoom } from '../../hooks/usePeerRoom'

enum PeerActions {
  MESSAGE = 'MESSAGE',
}

export function Room() {
  const { roomId = '' } = useParams()

  const { makeAction } = usePeerRoom({
    appId: `${window.location.origin}_${process.env.REACT_APP_NAME}`,
    roomId,
  })

  const [sendMessage, receiveMessage] = useMemo(
    () => makeAction<string>(PeerActions.MESSAGE),
    [makeAction]
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
