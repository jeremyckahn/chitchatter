import { ChangeEventHandler, useRef } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    isSharingFile,
    handleFileShareStart,
    handleFileShareStop,
    sharedFile,
  } = useRoomFileShare({
    peerRoom,
  })

  const handleToggleScreenShareButtonClick = () => {
    const { current: fileInput } = fileInputRef

    if (isSharingFile) {
      handleFileShareStop()
    } else {
      if (!fileInput) return

      fileInput.click()
    }
  }

  const handleFileSelect: ChangeEventHandler<HTMLInputElement> = e => {
    const file = e.target.files?.[0]

    if (!file) return

    handleFileShareStart(file)
  }

  if (!window.navigator?.mediaDevices?.getDisplayMedia) {
    return <></>
  }

  const shareFileLabel = sharedFile?.name ?? 'file'

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
      <input
        ref={fileInputRef}
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Tooltip
        title={
          // TODO: Display the file name here
          isSharingFile
            ? `Stop sharing ${shareFileLabel}`
            : 'Share a file with the room'
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
