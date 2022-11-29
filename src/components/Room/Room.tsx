import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { v4 as uuid } from 'uuid'

import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'
import { RoomContext } from 'contexts/RoomContext'
import { MessageForm } from 'components/MessageForm'
import { ChatTranscript } from 'components/ChatTranscript'

import { useRoom } from './useRoom'
import { RoomAudioControls } from './RoomAudioControls'
import { RoomVideoControls } from './RoomVideoControls'
import { RoomScreenShareControls } from './RoomScreenShareControls'
import { RoomFileUploadControls } from './RoomFileUploadControls'
import { RoomVideoDisplay } from './RoomVideoDisplay'

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
    isMessageSending,
    handleInlineMediaUpload,
    messageLog,
    peerRoom,
    roomContextValue,
    sendMessage,
    showVideoDisplay,
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

  return (
    <RoomContext.Provider value={roomContextValue}>
      <Box
        className="Room"
        sx={{
          height: '100%',
          display: 'flex',
          flexGrow: '1',
          overflow: 'auto',
        }}
      >
        {showVideoDisplay && <RoomVideoDisplay userId={userId} />}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: '1',
            overflow: 'auto',
          }}
        >
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel1a-content"
              id="panel1a-header"
            >
              <Typography
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                  flexGrow: 1,
                }}
              >
                Room tools
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                sx={{
                  alignItems: 'flex-start',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <RoomAudioControls peerRoom={peerRoom} />
                <RoomVideoControls peerRoom={peerRoom} />
                <RoomScreenShareControls peerRoom={peerRoom} />
                <RoomFileUploadControls
                  peerRoom={peerRoom}
                  onInlineMediaUpload={handleInlineMediaUpload}
                />
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
      </Box>
    </RoomContext.Provider>
  )
}
