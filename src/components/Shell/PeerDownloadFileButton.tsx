import Fab from '@mui/material/Fab'
import Download from '@mui/icons-material/Download'

import { torrentClient } from 'services/Torrent'
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
    await torrentClient.download(offeredFileId)
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
