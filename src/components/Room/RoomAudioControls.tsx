import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver'
import VoiceOverOff from '@mui/icons-material/VoiceOverOff'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

import { PeerRoom } from 'lib/PeerRoom'

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

  const [keysPressed, setKeysPressed] = useState({
    ctrl: false,
    shift: false,
    s: false,
  })

  useEffect(() => {
    // Handle microphone activation when the hotkey(Ctrl + Shift + S) is pressed
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        setKeysPressed(prev => ({ ...prev, ctrl: true }))
      }
      if (event.key === 'Shift') {
        setKeysPressed(prev => ({ ...prev, shift: true }))
      }
      if (event.key === 'S') {
        setKeysPressed(prev => ({ ...prev, s: true }))
      }

      if (keysPressed.ctrl && keysPressed.shift && keysPressed.s) {
        setIsSpeakingToRoom(true)
      }
    }

    // Handle microphone activation when the hotkey(Ctrl + Shift + S) is released
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        setKeysPressed(prev => ({ ...prev, ctrl: false }))
      }
      if (event.key === 'Shift') {
        setKeysPressed(prev => ({ ...prev, shift: false }))
      }
      if (event.key === 'S') {
        setKeysPressed(prev => ({ ...prev, s: false }))
      }

      if (!keysPressed.ctrl || !keysPressed.shift || !keysPressed.s) {
        setIsSpeakingToRoom(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [keysPressed, setIsSpeakingToRoom])

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
            ? 'Turn off microphone [Press Ctrl + Shift + S]'
            : 'Turn on microphone and speak to room [Hold Ctrl + Shift + S]'
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
