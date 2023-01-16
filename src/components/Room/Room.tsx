import { Dimensions } from 'react-native'

import { useContext, useState } from 'react'

import { Collapse } from '@mui/material'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import { v4 as uuid } from 'uuid'

import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { MessageForm } from 'components/MessageForm'
import { ChatTranscript } from 'components/ChatTranscript'

import { useRoom } from './useRoom'
import { RoomAudioControls } from './RoomAudioControls'
import { RoomVideoControls } from './RoomVideoControls'
import { RoomScreenShareControls } from './RoomScreenShareControls'
import { RoomFileUploadControls } from './RoomFileUploadControls'
import { RoomVideoDisplay } from './RoomVideoDisplay'
import { RoomShowMessagesControls } from './RoomShowMessagesControls'

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

  const showMessages = roomContextValue.isShowingMessages

  const { showRoomControls } = useContext(ShellContext)

  const [display, setDisplay] = useState(Dimensions.get('window'))
  Dimensions.addEventListener('change', ({ screen }) => setDisplay(screen))
  const landscape = display.width > display.height

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: '1',
            overflow: 'auto',
          }}
        >
          <Collapse in={showRoomControls}>
            <Box
              sx={{
                alignItems: 'flex-start',
                display: 'flex',
                justifyContent: 'center',
                padding: 1,
              }}
            >
              <RoomAudioControls peerRoom={peerRoom} />
              <RoomVideoControls peerRoom={peerRoom} />
              <RoomScreenShareControls peerRoom={peerRoom} />
              <RoomFileUploadControls
                peerRoom={peerRoom}
                onInlineMediaUpload={handleInlineMediaUpload}
              />
              {showVideoDisplay && <RoomShowMessagesControls />}
            </Box>
          </Collapse>
          <Box
            sx={{
              display: 'flex',
              flexDirection: landscape ? 'row' : 'column',
              height: '100%',
              width: '100%',
              overflow: 'auto',
            }}
          >
            {showVideoDisplay && (
              <RoomVideoDisplay
                userId={userId}
                width="100%"
                height={landscape || !showMessages ? '100%' : '60%'}
              />
            )}
            {showMessages && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: '1',
                  width: showVideoDisplay && landscape ? '400px' : '100%',
                  height: landscape ? '100%' : '40%',
                }}
              >
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
            )}
          </Box>
        </Box>
      </Box>
    </RoomContext.Provider>
  )
}
