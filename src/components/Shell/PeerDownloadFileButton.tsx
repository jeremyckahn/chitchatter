import { useCallback, useContext, useState } from 'react'
import Fab from '@mui/material/Fab'
import Download from '@mui/icons-material/Download'
import CircularProgress from '@mui/material/CircularProgress'

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
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const shellContext = useContext(ShellContext)
  const { offeredFileId } = peer

  const onProgress = useCallback((progress: number) => {
    setDownloadProgress(progress * 100)
  }, [])

  if (!offeredFileId) {
    return <></>
  }

  const handleDownloadFileClick = async () => {
    setIsDownloading(true)
    setDownloadProgress(null)

    try {
      await fileTransfer.download(offeredFileId, { onProgress })
    } catch (e) {
      if (isError(e)) {
        shellContext.showAlert(e.message, {
          severity: 'error',
        })
      }
    }

    setIsDownloading(false)
    setDownloadProgress(null)
  }

  return (
    <>
      {isDownloading ? (
        <CircularProgress
          variant={downloadProgress === null ? 'indeterminate' : 'determinate'}
          value={downloadProgress === null ? undefined : downloadProgress}
          sx={{ mr: 2 }}
        />
      ) : (
        <Fab
          color="primary"
          size="small"
          onClick={handleDownloadFileClick}
          sx={{ mr: 2 }}
        >
          <Download />
        </Fab>
      )}
    </>
  )
}
