import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { KeyboardEvent, useContext, useEffect, useRef, useState } from 'react'
import { TorrentFile } from 'webtorrent'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'

type TorrentFiles = TorrentFile[]

interface InlineMediaProps {
  magnetURI: string
}

interface InlineFileProps {
  file: Pick<TorrentFile, 'name' | 'appendTo'>
}

interface ImagePreview {
  src: string
  alt: string
}

const thumbnailMaxHeight = '300px'

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
  const [imagePreview, setImagePreview] = useState<ImagePreview>()
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
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
      file.appendTo(container, (err, element) => {
        if (err || !(element instanceof HTMLImageElement)) return

        // render-media creates the <img> outside of React, so it is made
        // operable as a button here. Activation is handled by the container.
        element.tabIndex = 0
        element.setAttribute('role', 'button')
        element.setAttribute('aria-label', `View ${name} full size`)
      })
    } catch (e) {
      console.error(e)
      setDidRenderingMediaFail(true)
    }
  }, [file, containerRef, shellContext.roomId])

  const openImagePreview = ({ src, alt }: HTMLImageElement) => {
    setImagePreview({ src, alt })
    setIsImagePreviewOpen(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!(event.target instanceof HTMLImageElement)) return

    // Stops Space from scrolling the transcript
    event.preventDefault()
    openImagePreview(event.target)
  }

  return (
    <Box
      ref={containerRef}
      onClick={({ target }) => {
        if (target instanceof HTMLImageElement) openImagePreview(target)
      }}
      onKeyDown={handleKeyDown}
      sx={{
        '& img': {
          maxWidth: '100%',
          maxHeight: thumbnailMaxHeight,
          cursor: 'zoom-in',
        },
      }}
    >
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
      <Dialog
        open={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        maxWidth={false}
      >
        <IconButton
          aria-label="close"
          onClick={() => setIsImagePreviewOpen(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={imagePreview?.src}
          alt={imagePreview?.alt}
          sx={{
            display: 'block',
            maxWidth: 'calc(100vw - 64px)',
            maxHeight: 'calc(100vh - 64px)',
          }}
        />
      </Dialog>
    </Box>
  )
}

export const InlineMedia = ({ magnetURI }: InlineMediaProps) => {
  const [hasDownloadInitiated, setHasDownloadInitiated] = useState(false)
  const [downloadedFiles, setDownloadedFiles] = useState<TorrentFiles>([])
  const shellContext = useContext(ShellContext)
  const {
    fileTransferService: { fileTransfer },
  } = useContext(RoomContext)

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
  }, [fileTransfer, hasDownloadInitiated, magnetURI, shellContext.roomId])

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
