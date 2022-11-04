import { useState } from 'react'
import Box from '@mui/material/Box'
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver'
import VoiceOverOff from '@mui/icons-material/VoiceOverOff'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Fab from '@mui/material/Fab'

import { PeerRoom } from 'services/PeerRoom/PeerRoom'

import { useRoomAudio } from './useRoomAudio'

export interface RoomAudioControlsProps {
  peerRoom: PeerRoom
}

export function RoomAudioControls({ peerRoom }: RoomAudioControlsProps) {
  const {
    audioDevices,
    isSpeakingToRoom,
    setIsSpeakingToRoom,
    handleAudioDeviceSelect,
  } = useRoomAudio({ peerRoom })

  const [audioAnchorEl, setAudioAnchorEl] = useState<null | HTMLElement>(null)
  const isAudioDeviceSelectOpen = Boolean(audioAnchorEl)
  const [selectedAudioDeviceIdx, setSelectedAudioDeviceIdx] = useState(0)

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
    <>
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
                onClick={event => handleAudioDeviceMenuItemClick(event, idx)}
              >
                {audioDevice.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      )}
    </>
  )
}
