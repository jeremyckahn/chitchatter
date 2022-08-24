import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'

import { usePeerRoom, usePeerRoomAction } from 'hooks/usePeerRoom'
import { PeerActions } from 'models/network'
import { UnsentMessage, ReceivedMessage } from 'models/chat'
import { ChatTranscript } from 'components/ChatTranscript'

export interface RoomProps {
  appId?: string
  getUuid?: typeof uuid
  roomId: string
  userId: string
}

export function Room({
  appId = `${encodeURI(window.location.origin)}_${process.env.REACT_APP_NAME}`,
  getUuid = uuid,
  roomId,
  userId,
}: RoomProps) {
  const [isMessageSending, setIsMessageSending] = useState(false)
  const [textMessage, setTextMessage] = useState('')
  const [messageLog, setMessageLog] = useState<
    Array<ReceivedMessage | UnsentMessage>
  >([])

  const peerRoom = usePeerRoom(
    {
      appId,
    },
    roomId
  )

  const [sendMessage, receiveMessage] = usePeerRoomAction<UnsentMessage>(
    peerRoom,
    PeerActions.MESSAGE
  )

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setTextMessage(value)
  }

  const handleMessageSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const unsentMessage: UnsentMessage = {
      authorId: userId,
      text: textMessage,
      timeSent: Date.now(),
      id: getUuid(),
    }

    setTextMessage('')
    setIsMessageSending(true)
    setMessageLog([...messageLog, unsentMessage])
    await sendMessage(unsentMessage)

    setMessageLog([
      ...messageLog,
      { ...unsentMessage, timeReceived: Date.now() },
    ])
    setIsMessageSending(false)
  }

  receiveMessage(message => {
    setMessageLog([...messageLog, { ...message, timeReceived: Date.now() }])
  })

  return (
    <div className="p-4">
      <Typography>Room ID: {roomId}</Typography>
      <Typography>Open this page in another tab.</Typography>
      <form onSubmit={handleMessageSubmit} className="max-w-xl mt-8">
        <FormControl fullWidth>
          <TextField
            variant="outlined"
            value={textMessage}
            onChange={handleMessageChange}
            size="medium"
            placeholder="Your message"
          />
        </FormControl>
        <Button
          variant="contained"
          type="submit"
          disabled={textMessage.length === 0 || isMessageSending}
          sx={{
            marginTop: 2,
          }}
        >
          Send
        </Button>
      </form>
      <ChatTranscript messageLog={messageLog} userId={userId} />
    </div>
  )
}
