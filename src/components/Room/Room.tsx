import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'

import { usePeerRoom, usePeerRoomAction, PeerActions } from 'hooks/usePeerRoom'

export function Room() {
  const { roomId = '' } = useParams()

  const [message, setMessage] = useState('')

  const peerRoom = usePeerRoom({
    appId: `${encodeURI(window.location.origin)}_${process.env.REACT_APP_NAME}`,
    roomId,
  })

  const [sendMessage, receiveMessage] = usePeerRoomAction<string>(
    peerRoom,
    PeerActions.MESSAGE
  )

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setMessage(value)
  }

  const handleMessageSubmit = (
    event: React.SyntheticEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    sendMessage(message)
    setMessage('')
  }

  receiveMessage(message => {
    console.log(message)
  })

  return (
    <div className="p-4">
      <Typography>Room ID: {roomId}</Typography>
      <Typography>
        Open this page in another tab and open the console.
      </Typography>
      <form onSubmit={handleMessageSubmit} className="max-w-xl mt-8">
        <FormControl fullWidth>
          <TextField
            label="Your message"
            variant="outlined"
            value={message}
            onChange={handleMessageChange}
            size="medium"
          />
        </FormControl>
        <Button
          variant="contained"
          type="submit"
          disabled={message.length === 0}
          sx={{
            marginTop: 2,
          }}
        >
          Send
        </Button>
      </form>
    </div>
  )
}
