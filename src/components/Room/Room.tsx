import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Fab from '@mui/material/Fab'
import ArrowUpward from '@mui/icons-material/ArrowUpward'

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
    <div className="h-full p-4 flex flex-col">
      <Typography>Room ID: {roomId}</Typography>
      <ChatTranscript
        messageLog={messageLog}
        userId={userId}
        className="grow overflow-auto"
      />
      <form onSubmit={handleMessageSubmit} className="mt-8">
        <Stack direction="row" spacing={2}>
          <FormControl fullWidth>
            <TextField
              variant="outlined"
              value={textMessage}
              onChange={handleMessageChange}
              size="medium"
              placeholder="Your message"
            />
          </FormControl>
          <Fab
            className="shrink-0"
            aria-label="Send"
            type="submit"
            disabled={textMessage.length === 0 || isMessageSending}
            color="primary"
          >
            <ArrowUpward />
          </Fab>
        </Stack>
      </form>
    </div>
  )
}
