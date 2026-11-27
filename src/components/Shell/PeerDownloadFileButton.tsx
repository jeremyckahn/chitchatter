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

/** A download in flight, and the offer it is for. */
interface ActiveDownload {
  magnetURI: string
  /** Percent complete, or `null` until the first progress report. */
  progress: number | null
}

export const PeerDownloadFileButton = ({
  peer,
}: PeerDownloadFileButtonProps) => {
  // Keyed by magnet URI, not a bare flag, because a download can outlive its
  // offer. When the owner withdraws, the room stops seeding the torrent and a
  // download still in progress never settles. A flag would then show a
  // spinner over the peer's next offer for good.
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(
    null
  )
  const shellContext = useContext(ShellContext)
  // The group room's own service, which `Shell` provides around the peer list.
  // The offer being downloaded is that room's, so this is the client whose
  // seeding the room stops when the offer is withdrawn or the room is left.
  const { fileTransfer } = useRoomFileTransfer()
  const { getDisplayUsername } = usePeerNameDisplay()
  const { offeredFile } = peer

  if (!offeredFile) {
    return <></>
  }

  const { magnetURI, fileKey } = offeredFile

  const isDownloading = activeDownload?.magnetURI === magnetURI
  const downloadProgress = isDownloading ? activeDownload.progress : null

  /** Applies `update` only while `magnetURI` is still the download shown. */
  const updateDownload = (update: ActiveDownload | null) => {
    setActiveDownload(current =>
      current?.magnetURI === magnetURI ? update : current
    )
  }

  const onProgress = (progress: number) => {
    updateDownload({ magnetURI, progress: progress * 100 })
  }

  const handleDownloadFileClick = async () => {
    setActiveDownload({ magnetURI, progress: null })

    try {
      await downloadAndSaveFiles({
        fileTransfer,
        magnetURI,
        fileKey,
        onProgress,
      })
    } catch (e) {
      if (isError(e)) {
        shellContext.showAlert(e.message, {
          severity: 'error',
        })
      }
    }

    updateDownload(null)
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
