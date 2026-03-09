import Download from '@mui/icons-material/Download'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ShellContext } from 'contexts/ShellContext'
import { isError } from 'lib/type-guards'
import { Peer } from 'models/chat'

import { usePeerNameDisplay } from 'components/PeerNameDisplay/usePeerNameDisplay'
import { RoomContext } from 'contexts/RoomContext'

interface PeerDownloadFileButtonProps {
  peer: Peer
}

export const PeerDownloadFileButton = ({
  peer,
}: PeerDownloadFileButtonProps) => {
  const { t } = useTranslation()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const shellContext = useContext(ShellContext)
  useContext(RoomContext)
  const { getDisplayUsername } = usePeerNameDisplay()
  const { offeredFileId } = peer

  if (!offeredFileId) {
    return <></>
  }

  const handleDownloadFileClick = async () => {
    setIsDownloading(true)
    setDownloadProgress(null)

    try {
      const { fileTransferGetOffered } = await import(
        'services/FileTransfer/FileTransfer'
      )
      const files = fileTransferGetOffered(offeredFileId)

      for (const file of files) {
        const a = document.createElement('a')
        a.href = file.url
        a.download = file.metadata.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      if (files.length === 0) {
        shellContext.showAlert('File not available', { severity: 'warning' })
      }
    } catch (e) {
      if (isError(e)) {
        shellContext.showAlert(e.message, { severity: 'error' })
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
          title={t('peerList.downloadFiles', {
            name: getDisplayUsername(peer.userId),
          })}
        >
          <Fab color="primary" size="small" onClick={handleDownloadFileClick}>
            <Download />
          </Fab>
        </Tooltip>
      )}
    </Box>
  )
}
