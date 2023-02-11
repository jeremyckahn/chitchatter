import { useEffect, useRef, useState } from 'react'
import { TorrentFile } from 'webtorrent'
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream'
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
    ;(async () => {
      const { current: container } = containerRef

      if (!container) return

      try {
        const readStream: NodeJS.ReadableStream = new ReadableWebToNodeStream(
          await fileTransfer.getDecryptedFileReadStream(file)
          // ReadableWebToNodeStream is the same as NodeJS.ReadableStream. The
          // library's typing is wrong.
        ) as any

        const decryptedFile: TorrentFile = {
          ...file,
          createReadStream: () => {
            return readStream
          },
        }

        Object.setPrototypeOf(decryptedFile, Object.getPrototypeOf(file))
        decryptedFile.appendTo(container)
      } catch (e) {
        console.error(e)
        setDidRenderingMediaFail(true)
      }
    })()
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
