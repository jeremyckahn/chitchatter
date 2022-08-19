import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'

import { usePeerRoom, usePeerRoomAction } from 'hooks/usePeerRoom'
import { PeerActions } from 'models/network'
import { UnsentMessage, ReceivedMessage } from 'models/chat'

export interface RoomProps {
  appId?: string
}

export function Room({
  appId = `${encodeURI(window.location.origin)}_${process.env.REACT_APP_NAME}`,
}: RoomProps) {
  const { roomId = '' } = useParams()

  const [textMessage, setTextMessage] = useState('')
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>(
    []
  )

  const peerRoom = usePeerRoom({
    appId,
    roomId,
  })

  const [sendMessage, receiveMessage] = usePeerRoomAction<UnsentMessage>(
    peerRoom,
    PeerActions.MESSAGE
  )

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setTextMessage(value)
  }

  const handleMessageSubmit = (
    event: React.SyntheticEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    sendMessage({ text: textMessage, timeSent: Date.now() })
    setTextMessage('')
  }

  receiveMessage(message => {
    setReceivedMessages([
      ...receivedMessages,
      { ...message, timeReceived: Date.now() },
    ])
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
            value={textMessage}
            onChange={handleMessageChange}
            size="medium"
          />
        </FormControl>
        <Button
          variant="contained"
          type="submit"
          disabled={textMessage.length === 0}
          sx={{
            marginTop: 2,
          }}
        >
          Send
        </Button>
      </form>
      <div>
        {receivedMessages.map((message, idx) => (
          <Typography key={`${idx}_${message}`}>{message.text}</Typography>
        ))}
      </div>
    </div>
  )
}
