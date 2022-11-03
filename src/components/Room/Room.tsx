import { useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver'
import VoiceOverOff from '@mui/icons-material/VoiceOverOff'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
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
    audioDevices,
    messageLog,
    sendMessage,
    isMessageSending,
    isSpeakingToRoom,
    setIsSpeakingToRoom,
    handleAudioDeviceSelect,
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

  const [audioAnchorEl, setAudioAnchorEl] = useState<null | HTMLElement>(null)
  const isAudioDeviceSelectOpen = Boolean(audioAnchorEl)
  const [selectedAudioDeviceIdx, setSelectedAudioDeviceIdx] = useState(0)

  const handleMessageSubmit = async (message: string) => {
    await sendMessage(message)
  }

  const handleVoiceCallClick = () => {
    setIsSpeakingToRoom(!isSpeakingToRoom)
  }

  const handleAudioDeviceListItemClick = (
    event: React.MouseEvent<HTMLElement>
  ) => {
    setAudioAnchorEl(event.currentTarget)
  }

  const handleAudioDeviceMenuItemClick = (
    _event: React.MouseEvent<HTMLElement>,
    idx: number
  ) => {
    setSelectedAudioDeviceIdx(idx)
    handleAudioDeviceSelect(audioDevices[idx])
    setAudioAnchorEl(null)
  }

  const handleAudioInputSelectMenuClose = () => {
    setAudioAnchorEl(null)
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
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Fab
              variant="extended"
              color={isSpeakingToRoom ? 'error' : 'success'}
              aria-label="call"
              onClick={handleVoiceCallClick}
            >
              {isSpeakingToRoom ? (
                <>
                  <VoiceOverOff sx={{ mr: 1 }} />
                  Stop speaking to room
                </>
              ) : (
                <>
                  <RecordVoiceOver sx={{ mr: 1 }} />
                  Start speaking to room
                </>
              )}
            </Fab>
            {audioDevices.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <List
                  component="nav"
                  aria-label="Audio device selection"
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <ListItem
                    button
                    id="audio-input-select-button"
                    aria-haspopup="listbox"
                    aria-controls="audio-input-select-menu"
                    aria-label="Audio input device to use"
                    aria-expanded={isAudioDeviceSelectOpen ? 'true' : undefined}
                    onClick={handleAudioDeviceListItemClick}
                  >
                    <ListItemText
                      primary="Selected audio input device"
                      secondary={audioDevices[selectedAudioDeviceIdx]?.label}
                    />
                  </ListItem>
                </List>
                <Menu
                  id="audio-input-select-menu"
                  anchorEl={audioAnchorEl}
                  open={isAudioDeviceSelectOpen}
                  onClose={handleAudioInputSelectMenuClose}
                  MenuListProps={{
                    'aria-labelledby': 'audio-input-select-button',
                    role: 'listbox',
                  }}
                >
                  {audioDevices.map((audioDevice, idx) => (
                    <MenuItem
                      key={audioDevice.deviceId}
                      selected={idx === selectedAudioDeviceIdx}
                      onClick={event =>
                        handleAudioDeviceMenuItemClick(event, idx)
                      }
                    >
                      {audioDevice.label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )}
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
