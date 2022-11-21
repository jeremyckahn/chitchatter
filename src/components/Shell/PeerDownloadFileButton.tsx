import Fab from '@mui/material/Fab'
import Download from '@mui/icons-material/Download'

import { fileTransfer } from 'services/FileTransfer/index'
import { Peer } from 'models/chat'

interface PeerDownloadFileButtonProps {
  peer: Peer
}

export const PeerDownloadFileButton = ({
  peer,
}: PeerDownloadFileButtonProps) => {
  const { offeredFileId } = peer

  if (!offeredFileId) {
    return <></>
  }

  const handleDownloadFileClick = async () => {
    await fileTransfer.download(offeredFileId)
  }

  return (
    <Fab
      color="primary"
      size="small"
      onClick={handleDownloadFileClick}
      sx={{ mr: 2 }}
    >
      <Download />
    </Fab>
  )
}
