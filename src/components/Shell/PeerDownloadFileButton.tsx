import { useContext } from 'react'
import Fab from '@mui/material/Fab'
import Download from '@mui/icons-material/Download'

import { isError } from 'utils'
import { fileTransfer } from 'services/FileTransfer/index'
import { Peer } from 'models/chat'
import { ShellContext } from 'contexts/ShellContext'

interface PeerDownloadFileButtonProps {
  peer: Peer
}

export const PeerDownloadFileButton = ({
  peer,
}: PeerDownloadFileButtonProps) => {
  const shellContext = useContext(ShellContext)
  const { offeredFileId } = peer

  if (!offeredFileId) {
    return <></>
  }

  const handleDownloadFileClick = async () => {
    try {
      await fileTransfer.download(offeredFileId)
    } catch (e) {
      if (isError(e)) {
        shellContext.showAlert(e.message, {
          severity: 'error',
        })
      }
    }
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
