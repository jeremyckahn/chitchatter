import { ChangeEventHandler, useContext, useRef } from 'react'
import Box from '@mui/material/Box'
import UploadFile from '@mui/icons-material/UploadFile'
import Cancel from '@mui/icons-material/Cancel'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'

import { RoomContext } from 'contexts/RoomContext'
import { PeerRoom } from 'services/PeerRoom/PeerRoom'

import { useRoomFileShare } from './useRoomFileShare'

export interface RoomFileUploadControlsProps {
  onInlineMediaUpload: (files: File[]) => void
  peerRoom: PeerRoom
}

export function RoomFileUploadControls({
  peerRoom,
  onInlineMediaUpload,
}: RoomFileUploadControlsProps) {
  const roomContext = useContext(RoomContext)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isMessageSending } = roomContext

  const {
    isFileSharingEnabled,
    isSharingFile,
    handleFileShareStart,
    handleFileShareStop,
    sharedFiles,
  } = useRoomFileShare({
    peerRoom,
    onInlineMediaUpload,
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

  const shareFileLabel =
    (sharedFiles && sharedFiles.length === 1 && sharedFiles[0].name) || 'files'

  const disableFileUpload = !isFileSharingEnabled || isMessageSending

  const buttonIcon = isSharingFile ? <Cancel /> : <UploadFile />

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
          disabled={disableFileUpload}
        >
          {isFileSharingEnabled ? (
            buttonIcon
          ) : (
            <CircularProgress variant="indeterminate" color="inherit" />
          )}
        </Fab>
      </Tooltip>
    </Box>
  )
}
