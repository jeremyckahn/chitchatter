import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useContext, useEffect, useState } from 'react'
import { TorrentFile } from 'webtorrent'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'

type TorrentFiles = TorrentFile[]

interface InlineMediaProps {
  magnetURI: string
}

interface InlineFileProps {
  file: Pick<TorrentFile, 'name' | 'length' | 'getBlobURL'>
}

const thumbnailMaxHeight = '300px'

// Twice the default MUI Dialog margin (32px), so the full-size image never
// touches the edges of the viewport.
const imagePreviewViewportInset = '64px'

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

// Matches render-media's MAX_BLOB_LENGTH, which this component used to
// inherit through appendTo
const maxInlineMediaBytes = 200 * 1000 * 1000

const useBlobUrl = (
  file: Pick<TorrentFile, 'getBlobURL'>,
  isEnabled: boolean
) => {
  const [url, setUrl] = useState<string>()
  const [didFail, setDidFail] = useState(false)

  useEffect(() => {
    if (!isEnabled) return undefined

    let isCurrent = true
    let blobUrl: string | undefined

    file.getBlobURL((err, createdUrl) => {
      if (err || !createdUrl) {
        if (isCurrent) setDidFail(true)
        return
      }

      // The component went away while the blob was being built
      if (!isCurrent) {
        URL.revokeObjectURL(createdUrl)
        return
      }

      blobUrl = createdUrl
      setUrl(createdUrl)
    })

    return () => {
      isCurrent = false

      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [file, isEnabled])

  return { url, didFail }
}

export const InlineFile = ({ file }: InlineFileProps) => {
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)

  const { name } = file
  const fileNameExtension = `.${name.split('.').pop() ?? ''}`
  const isImage = supportedImageExtensions.includes(fileNameExtension)
  const isMediaSupported =
    supportedMediaExtensions.includes(fileNameExtension) &&
    file.length <= maxInlineMediaBytes

  const { url, didFail } = useBlobUrl(file, isMediaSupported)

  if (!isMediaSupported) {
    return (
      <Typography sx={{ fontStyle: 'italic' }}>
        Media preview not supported
      </Typography>
    )
  }

  if (didFail) {
    return (
      <Typography sx={{ fontStyle: 'italic' }}>
        Media failed to render
      </Typography>
    )
  }

  if (!url) return null

  if (!isImage) return <audio controls src={url} />

  return (
    <>
      <ButtonBase
        onClick={() => setIsImagePreviewOpen(true)}
        aria-label={`View ${name} full size`}
        sx={{ cursor: 'zoom-in' }}
      >
        <Box
          component="img"
          src={url}
          alt={name}
          sx={{ maxWidth: '100%', maxHeight: thumbnailMaxHeight }}
        />
      </ButtonBase>
      <Dialog
        open={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        maxWidth={false}
        // MUI puts aria-label on the wrapper, so it goes on the paper, which
        // has role="dialog"
        PaperProps={{ 'aria-label': `${name} preview` }}
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
          src={url}
          alt={name}
          sx={{
            display: 'block',
            maxWidth: `calc(100vw - ${imagePreviewViewportInset})`,
            maxHeight: `calc(100vh - ${imagePreviewViewportInset})`,
          }}
        />
      </Dialog>
    </>
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
