import React, { useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Fab from '@mui/material/Fab'
import ArrowUpward from '@mui/icons-material/ArrowUpward'

import { ShellContext } from 'ShellContext'
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
  const shellContext = useContext(ShellContext)
  const [isMessageSending, setIsMessageSending] = useState(false)
  const [textMessage, setTextMessage] = useState('')
  const [messageLog, setMessageLog] = useState<
    Array<ReceivedMessage | UnsentMessage>
  >([])

  const peerRoom = usePeerRoom(
    {
      appId,
      trackerUrls: process.env.REACT_APP_TRACKER_URL
        ? [process.env.REACT_APP_TRACKER_URL]
        : undefined,
      rtcConfig: {
        iceServers: [
          {
            urls: 'stun:openrelay.metered.ca:80',
          },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ],
      },
    },
    roomId
  )

  useEffect(() => {
    peerRoom.onPeersChange((numberOfPeers: number) => {
      shellContext.setNumberOfPeers(numberOfPeers)
    })
  }, [peerRoom, shellContext])

  const [sendMessage, receiveMessage] = usePeerRoomAction<UnsentMessage>(
    peerRoom,
    PeerActions.MESSAGE
  )

  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setTextMessage(value)
  }

  const canMessageBeSent = () => {
    return textMessage.trim().length > 0 && !isMessageSending
  }

  const performMessageSend = async () => {
    if (!canMessageBeSent()) return

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

  const handleMessageKeyPress = async (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const { key, shiftKey } = event

    if (key === 'Enter' && shiftKey === false) {
      event.preventDefault()
      await performMessageSend()
    }
  }

  const handleMessageSubmit = async (
    event: React.SyntheticEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    await performMessageSend()
  }

  receiveMessage(message => {
    setMessageLog([...messageLog, { ...message, timeReceived: Date.now() }])
  })

  return (
    <Box className="h-full p-4 flex flex-col">
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
              onKeyPress={handleMessageKeyPress}
              size="medium"
              placeholder="Your message"
              multiline
            />
          </FormControl>
          <Fab
            sx={{
              flexShrink: 0,
              // The !important is needed to override a Stack style
              marginTop: 'auto!important',
            }}
            aria-label="Send"
            type="submit"
            disabled={!canMessageBeSent()}
            color="primary"
          >
            <ArrowUpward />
          </Fab>
        </Stack>
      </form>
    </Box>
  )
}
