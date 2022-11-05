import { useState } from 'react'
import Box from '@mui/material/Box'
import Videocam from '@mui/icons-material/Videocam'
import VideocamOff from '@mui/icons-material/VideocamOff'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Fab from '@mui/material/Fab'

import { PeerRoom } from 'services/PeerRoom/PeerRoom'

import { useRoomVideo } from './useRoomVideo'

export interface RoomVideoControlsProps {
  peerRoom: PeerRoom
}

export function RoomVideoControls({ peerRoom }: RoomVideoControlsProps) {
  const {
    videoDevices,
    isSpeakingToRoom,
    setIsSpeakingToRoom,
    handleVideoDeviceSelect,
  } = useRoomVideo({ peerRoom })

  const [videoAnchorEl, setVideoAnchorEl] = useState<null | HTMLElement>(null)
  const isVideoDeviceSelectOpen = Boolean(videoAnchorEl)
  const [selectedVideoDeviceIdx, setSelectedVideoDeviceIdx] = useState(0)

  const handleVoiceCallClick = () => {
    setIsSpeakingToRoom(!isSpeakingToRoom)
  }

  const handleVideoDeviceListItemClick = (
    event: React.MouseEvent<HTMLElement>
  ) => {
    setVideoAnchorEl(event.currentTarget)
  }

  const handleVideoDeviceMenuItemClick = (
    _event: React.MouseEvent<HTMLElement>,
    idx: number
  ) => {
    setSelectedVideoDeviceIdx(idx)
    handleVideoDeviceSelect(videoDevices[idx])
    setVideoAnchorEl(null)
  }

  const handleVideoInputSelectMenuClose = () => {
    setVideoAnchorEl(null)
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
      <Fab
        variant="extended"
        color={isSpeakingToRoom ? 'error' : 'success'}
        aria-label="call"
        onClick={handleVoiceCallClick}
      >
        {isSpeakingToRoom ? (
          <>
            <VideocamOff sx={{ mr: 1 }} />
            Turn off camera
          </>
        ) : (
          <>
            <Videocam sx={{ mr: 1 }} />
            Turn on camera
          </>
        )}
      </Fab>
      {videoDevices.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <List
            component="nav"
            aria-label="Video device selection"
            sx={{ bgcolor: 'background.paper' }}
          >
            <ListItem
              button
              id="video-input-select-button"
              aria-haspopup="listbox"
              aria-controls="video-input-select-menu"
              aria-label="Video input device to use"
              aria-expanded={isVideoDeviceSelectOpen ? 'true' : undefined}
              onClick={handleVideoDeviceListItemClick}
            >
              <ListItemText
                primary="Selected video input device"
                secondary={videoDevices[selectedVideoDeviceIdx]?.label}
              />
            </ListItem>
          </List>
          <Menu
            id="video-input-select-menu"
            anchorEl={videoAnchorEl}
            open={isVideoDeviceSelectOpen}
            onClose={handleVideoInputSelectMenuClose}
            MenuListProps={{
              'aria-labelledby': 'video-input-select-button',
              role: 'listbox',
            }}
          >
            {videoDevices.map((videoDevice, idx) => (
              <MenuItem
                key={videoDevice.deviceId}
                selected={idx === selectedVideoDeviceIdx}
                onClick={event => handleVideoDeviceMenuItemClick(event, idx)}
              >
                {videoDevice.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      )}
    </Box>
  )
}