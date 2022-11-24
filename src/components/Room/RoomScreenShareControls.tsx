import Box from '@mui/material/Box'
import ScreenShare from '@mui/icons-material/ScreenShare'
import StopScreenShare from '@mui/icons-material/StopScreenShare'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'

import { PeerRoom } from 'services/PeerRoom/PeerRoom'

import { useRoomScreenShare } from './useRoomScreenShare'

export interface RoomFileUploadControlsProps {
  peerRoom: PeerRoom
}

export function RoomScreenShareControls({
  peerRoom,
}: RoomFileUploadControlsProps) {
  const { isSharingScreen, handleScreenShareStart, handleScreenShareStop } =
    useRoomScreenShare({
      peerRoom,
    })

  const handleToggleScreenShareButtonClick = () => {
    if (isSharingScreen) {
      handleScreenShareStop()
    } else {
      handleScreenShareStart()
    }
  }

  if (!window.navigator?.mediaDevices?.getDisplayMedia) {
    return <></>
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
          isSharingScreen ? 'Stop sharing screen' : 'Share screen with room'
        }
      >
        <Fab
          color={isSharingScreen ? 'error' : 'success'}
          aria-label="share screen"
          onClick={handleToggleScreenShareButtonClick}
        >
          {isSharingScreen ? <StopScreenShare /> : <ScreenShare />}
        </Fab>
      </Tooltip>
    </Box>
  )
}
