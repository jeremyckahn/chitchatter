import { useContext, useEffect, useRef, useState } from 'react'
import { TorrentFile } from 'webtorrent'
import CircularProgress from '@mui/material/CircularProgress'
import { Typography } from '@mui/material'

import { fileTransfer } from 'services/FileTransfer'
import { ShellContext } from 'contexts/ShellContext'

type TorrentFiles = Awaited<ReturnType<typeof fileTransfer.download>>

interface InlineMediaProps {
  magnetURI: string
}

interface InlineFileProps {
  file: TorrentFile
}

export const InlineFile = ({ file }: InlineFileProps) => {
  const containerRef = useRef(null)
  const [didRenderingMediaFail, setDidRenderingMediaFail] = useState(false)
  const shellContext = useContext(ShellContext)

  useEffect(() => {
    ;(async () => {
      const { current: container } = containerRef

      if (!container) return

      try {
        file.appendTo(container)
      } catch (e) {
        console.error(e)
        setDidRenderingMediaFail(true)
      }
    })()
  }, [file, containerRef, shellContext.roomId])

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
  const shellContext = useContext(ShellContext)

  useEffect(() => {
    ;(async () => {
      if (hasDownloadInitiated) return
      if (typeof shellContext.roomId !== 'string') {
        throw new Error('shellContext.roomId is not a string')
      }

      setHasDownloadInitiated(true)
      const files = await fileTransfer.download(magnetURI, shellContext.roomId)
      setDownloadedFiles(files)
    })()
  }, [hasDownloadInitiated, magnetURI, shellContext.roomId])

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
