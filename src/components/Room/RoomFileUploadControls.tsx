import { ChangeEventHandler, useContext, useRef } from 'react'
import Box from '@mui/material/Box'
import Folder from '@mui/icons-material/Folder'
import FolderOff from '@mui/icons-material/FolderOff'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'

import { RoomContext } from 'contexts/RoomContext'
import { PeerRoom } from 'lib/PeerRoom'

import { Input } from 'components/Elements'

import { useRoomFileShare } from './useRoomFileShare'
import { MediaButton } from './MediaButton'

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

    if (!files || files.length < 1) return

    handleFileShareStart(files)
  }

  const shareFileLabel =
    (sharedFiles && sharedFiles.length === 1 && sharedFiles[0].name) || 'files'

  const disableFileUpload = !isFileSharingEnabled || isMessageSending

  const buttonIcon = isSharingFile ? <Folder /> : <FolderOff />

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
      <Input
        multiple
        ref={fileInputRef}
        type="file"
        id="file-upload"
        sx={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <Tooltip
        title={
          isSharingFile
            ? `Stop sharing ${shareFileLabel}`
            : 'Share files with the room'
        }
      >
        <MediaButton
          isActive={isSharingFile}
          aria-label="share screen"
          onClick={handleToggleScreenShareButtonClick}
          disabled={disableFileUpload}
        >
          {isFileSharingEnabled ? (
            buttonIcon
          ) : (
            <CircularProgress variant="indeterminate" color="inherit" />
          )}
        </MediaButton>
      </Tooltip>
    </Box>
  )
}
