import Box from '@mui/material/Box'
import UploadFile from '@mui/icons-material/UploadFile'
import Cancel from '@mui/icons-material/Cancel'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'

import { PeerRoom } from 'services/PeerRoom/PeerRoom'

import { useRoomFileShare } from './useRoomFileShare'

export interface RoomFileUploadControlsProps {
  peerRoom: PeerRoom
}

export function RoomFileUploadControls({
  peerRoom,
}: RoomFileUploadControlsProps) {
  const { isSharingFile, handleFileShareStart, handleFileShareStop } =
    useRoomFileShare({
      peerRoom,
    })

  const handleToggleScreenShareButtonClick = () => {
    if (isSharingFile) {
      handleFileShareStop()
    } else {
      handleFileShareStart()
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
          // TODO: Display the file name here
          isSharingFile ? 'Stop sharing files' : 'Share a file with the room'
        }
      >
        <Fab
          color={isSharingFile ? 'error' : 'success'}
          aria-label="share screen"
          onClick={handleToggleScreenShareButtonClick}
        >
          {isSharingFile ? <Cancel /> : <UploadFile />}
        </Fab>
      </Tooltip>
    </Box>
  )
}
