import Download from '@mui/icons-material/Download'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import { useContext, useState } from 'react'

import { ShellContext } from 'contexts/ShellContext'
import { isError } from 'core/lib/type-guards'
import { Peer } from 'core/models/chat'

import { usePeerNameDisplay } from 'components/PeerNameDisplay/usePeerNameDisplay'
import { useRoomFileTransfer } from 'contexts/RoomFileTransferContext'
import { downloadAndSaveFiles } from 'services/FileTransfer'

interface PeerDownloadFileButtonProps {
  peer: Peer
}

export const PeerDownloadFileButton = ({
  peer,
}: PeerDownloadFileButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const shellContext = useContext(ShellContext)
  // The group room's own service, which `Shell` provides around the peer list.
  // The offer being downloaded is that room's, so this is the client whose
  // seeding the room stops when the offer is withdrawn or the room is left.
  const { fileTransfer } = useRoomFileTransfer()
  const { getDisplayUsername } = usePeerNameDisplay()
  const { offeredFile } = peer

  const onProgress = (progress: number) => {
    setDownloadProgress(progress * 100)
  }

  if (!offeredFile) {
    return <></>
  }

  const handleDownloadFileClick = async () => {
    setIsDownloading(true)
    setDownloadProgress(null)

    try {
      await downloadAndSaveFiles({
        fileTransfer,
        magnetURI: offeredFile.magnetURI,
        fileKey: offeredFile.fileKey,
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
