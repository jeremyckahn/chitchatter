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
    sharedFiles,
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
    const { files } = e.target

    if (!files) return

    handleFileShareStart(files)
  }

  if (!window.navigator?.mediaDevices?.getDisplayMedia) {
    return <></>
  }

  const shareFileLabel =
    (sharedFiles && sharedFiles.length === 1 && sharedFiles[0].name) || 'files'

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
        multiple
        ref={fileInputRef}
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Tooltip
        title={
          isSharingFile
            ? `Stop sharing ${shareFileLabel}`
            : 'Share files with the room'
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
