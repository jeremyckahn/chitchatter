import { useState } from 'react'
import Box from '@mui/material/Box'
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver'
import VoiceOverOff from '@mui/icons-material/VoiceOverOff'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

import { PeerRoom } from 'services/PeerRoom/PeerRoom'

import { useRoomAudio } from './useRoomAudio'
import { MediaButton } from './MediaButton'

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
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: 1,
      }}
    >
      <Tooltip
        title={
          isSpeakingToRoom
            ? 'Turn off microphone'
            : 'Turn on microphone and speak to room'
        }
      >
        <MediaButton
          isActive={isSpeakingToRoom}
          aria-label="call"
          onClick={handleVoiceCallClick}
        >
          {isSpeakingToRoom ? <RecordVoiceOver /> : <VoiceOverOff />}
        </MediaButton>
      </Tooltip>
      {audioDevices.length > 0 && isSpeakingToRoom && (
        <Box sx={{ mt: 1 }}>
          <List
            component="nav"
            aria-label="Microphone selection"
            sx={{ bgcolor: 'background.paper' }}
          >
            <ListItem
              button
              id="audio-input-select-button"
              aria-haspopup="listbox"
              aria-controls="audio-input-select-menu"
              aria-label="Microphone to use"
              aria-expanded={isAudioDeviceSelectOpen ? 'true' : undefined}
              onClick={handleAudioDeviceListItemClick}
            >
              <ListItemText
                primary="Selected microphone"
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
    </Box>
  )
}
