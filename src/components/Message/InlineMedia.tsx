import { useEffect, useRef, useState } from 'react'
import CircularProgress from '@mui/material/CircularProgress'

import { fileTransfer } from 'services/FileTransfer'
import { Typography } from '@mui/material'

type TorrentFiles = Awaited<ReturnType<typeof fileTransfer.download>>

interface InlineMediaProps {
  magnetURI: string
}

interface InlineFileProps {
  file: TorrentFiles[0]
}

export const InlineFile = ({ file }: InlineFileProps) => {
  const containerRef = useRef(null)
  const [didRenderingMediaFail, setDidRenderingMediaFail] = useState(false)

  useEffect(() => {
    const { current: container } = containerRef

    if (!container) return

    try {
      file.appendTo(container)
    } catch (e) {
      setDidRenderingMediaFail(true)
    }
  }, [file, containerRef])

  return (
    <div ref={containerRef}>
      {didRenderingMediaFail && (
        <Typography sx={{ fontStyle: 'italic' }}>
          Media failed to render
        </Typography>
      )}
    </div>
  )
}

export const InlineMedia = ({ magnetURI }: InlineMediaProps) => {
  const [hasDownloadInitiated, setHasDownloadInitiated] = useState(false)
  const [downloadedFiles, setDownloadedFiles] = useState<TorrentFiles>([])

  useEffect(() => {
    ;(async () => {
      if (hasDownloadInitiated) return

      setHasDownloadInitiated(true)
      const files = await fileTransfer.download(magnetURI)
      setDownloadedFiles(files)
    })()
  }, [hasDownloadInitiated, magnetURI])

  return (
    <>
      {hasDownloadInitiated && downloadedFiles.length === 0 ? (
        <CircularProgress variant="indeterminate" color="inherit" />
      ) : (
        downloadedFiles.map(file => <InlineFile file={file} key={file.name} />)
      )}
    </>
  )
}
