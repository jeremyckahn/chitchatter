import { useContext, useEffect, useRef, useState } from 'react'
import { TorrentFile } from 'webtorrent'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { fileTransfer } from 'lib/FileTransfer'
import { ShellContext } from 'contexts/ShellContext'

type TorrentFiles = Awaited<ReturnType<typeof fileTransfer.download>>

interface InlineMediaProps {
  magnetURI: string
}

interface InlineFileProps {
  file: TorrentFile
}

// NOTE: These filename extensions are copied from render-media, the upstream
// library used to embed media files:
// https://github.com/feross/render-media/blob/a445b2ab90fcd4a248552d32027b2bc6a02600c8/index.js#L15-L72
const supportedImageExtensions = [
  '.bmp',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
]

const supportedAudioExtensions = ['.aac', '.oga', '.ogg', '.wav', '.flac']

const supportedMediaExtensions = [
  ...supportedImageExtensions,
  ...supportedAudioExtensions,
]

export const InlineFile = ({ file }: InlineFileProps) => {
  const containerRef = useRef(null)
  const [didRenderingMediaFail, setDidRenderingMediaFail] = useState(false)
  const [isMediaSupported, setIsMediaSupported] = useState(true)
  const shellContext = useContext(ShellContext)

  useEffect(() => {
    const { current: container } = containerRef

    if (!container) return

    const { name } = file
    const fileNameExtension = name.split('.').pop() ?? ''

    if (!supportedMediaExtensions.includes(`.${fileNameExtension}`)) {
      setIsMediaSupported(false)
      return
    }

    try {
      file.appendTo(container)
    } catch (e) {
      console.error(e)
      setDidRenderingMediaFail(true)
    }
  }, [file, containerRef, shellContext.roomId])

  return (
    <Box ref={containerRef} sx={{ '& img': { maxWidth: '100%' } }}>
      {!isMediaSupported && (
        <Typography sx={{ fontStyle: 'italic' }}>
          Media preview not supported
        </Typography>
      )}
      {didRenderingMediaFail && (
        <Typography sx={{ fontStyle: 'italic' }}>
          Media failed to render
        </Typography>
      )}
    </Box>
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
