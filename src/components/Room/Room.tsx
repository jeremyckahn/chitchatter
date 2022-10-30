import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PhoneEnabled from '@mui/icons-material/PhoneEnabled'
import PhoneDisabled from '@mui/icons-material/PhoneDisabled'
import Fab from '@mui/material/Fab'
import { v4 as uuid } from 'uuid'

import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'
import { MessageForm } from 'components/MessageForm'
import { ChatTranscript } from 'components/ChatTranscript'

import { useRoom } from './useRoom'

export interface RoomProps {
  appId?: string
  getUuid?: typeof uuid
  password?: string
  roomId: string
  userId: string
}

export function Room({
  appId = `${encodeURI(window.location.origin)}_${process.env.REACT_APP_NAME}`,
  getUuid = uuid,
  roomId,
  password,
  userId,
}: RoomProps) {
  const {
    messageLog,
    sendMessage,
    isMessageSending,
    isVoiceCalling,
    setIsVoiceCalling,
  } = useRoom(
    {
      appId,
      trackerUrls,
      rtcConfig,
      password,
    },
    {
      roomId,
      userId,
      getUuid,
    }
  )

  const handleMessageSubmit = async (message: string) => {
    await sendMessage(message)
  }

  const handleVoiceCallClick = () => {
    setIsVoiceCalling(!isVoiceCalling)
  }

  return (
    <Box
      className="Room"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        ></AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Fab
              variant="extended"
              color={isVoiceCalling ? 'error' : 'success'}
              aria-label="call"
              onClick={handleVoiceCallClick}
            >
              {isVoiceCalling ? (
                <>
                  <PhoneDisabled sx={{ mr: 1 }} />
                  End voice call
                </>
              ) : (
                <>
                  <PhoneEnabled sx={{ mr: 1 }} />
                  Start voice call
                </>
              )}
            </Fab>
          </Box>
        </AccordionDetails>
      </Accordion>
      <ChatTranscript
        messageLog={messageLog}
        userId={userId}
        className="grow overflow-auto px-4"
      />
      <Divider />
      <MessageForm
        onMessageSubmit={handleMessageSubmit}
        isMessageSending={isMessageSending}
      />
    </Box>
  )
}
