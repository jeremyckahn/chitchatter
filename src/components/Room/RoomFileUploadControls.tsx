import { ChangeEventHandler } from 'react'
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

  const handleFileSelect: ChangeEventHandler<HTMLInputElement> = e => {
    const file = e.target.files?.[0]

    if (!file) return

    console.log({ file })
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
        <>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileSelect}
          />
          <label htmlFor={isSharingFile ? 'file-upload' : ''}>
            <Fab
              color={isSharingFile ? 'error' : 'success'}
              aria-label="share screen"
              onClick={handleToggleScreenShareButtonClick}
            >
              {isSharingFile ? <Cancel /> : <UploadFile />}
            </Fab>
          </label>
        </>
      </Tooltip>
    </Box>
  )
}
