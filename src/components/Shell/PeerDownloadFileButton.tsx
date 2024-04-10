import { useContext, useState } from 'react'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import Download from '@mui/icons-material/Download'
import CircularProgress from '@mui/material/CircularProgress'

import { isError } from 'lib/type-guards'
import { fileTransfer } from 'lib/FileTransfer'
import { Peer } from 'models/chat'
import { ShellContext } from 'contexts/ShellContext'

import { usePeerNameDisplay } from 'components/PeerNameDisplay/usePeerNameDisplay'

interface PeerDownloadFileButtonProps {
  peer: Peer
}

export const PeerDownloadFileButton = ({
  peer,
}: PeerDownloadFileButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const shellContext = useContext(ShellContext)
  const { getDisplayUsername } = usePeerNameDisplay()
  const { offeredFileId } = peer

  const onProgress = (progress: number) => {
    setDownloadProgress(progress * 100)
  }

  if (!offeredFileId) {
    return <></>
  }

  const handleDownloadFileClick = async () => {
    setIsDownloading(true)
    setDownloadProgress(null)

    try {
      if (typeof shellContext.roomId !== 'string') {
        throw new Error('shellContext.roomId is not a string')
      }

      await fileTransfer.download(offeredFileId, shellContext.roomId, {
        doSave: true,
        onProgress,
      })
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
    <Box className="PeerDownloadFileButton" sx={{ mr: 2 }}>
      {isDownloading ? (
        <CircularProgress
          variant={downloadProgress === null ? 'indeterminate' : 'determinate'}
          value={downloadProgress === null ? undefined : downloadProgress}
          sx={{
            transition: 'none',
          }}
        />
      ) : (
        <Tooltip
          title={`Download files being offered by ${getDisplayUsername(
            peer.userId
          )}`}
        >
          <Fab color="primary" size="small" onClick={handleDownloadFileClick}>
            <Download />
          </Fab>
        </Tooltip>
      )}
    </Box>
  )
}
