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
import { FileReference } from 'core/models/chat'

import {
  InlineMediaDownload,
  InlineMediaDownloadState,
  InlineMediaFile,
  useInlineMediaDownload,
} from './useInlineMediaDownload'

type InlineMediaProps = FileReference

interface InlineFileProps {
  file: InlineMediaFile
}

const thumbnailMaxHeight = '300px'

// Twice the default MUI Dialog margin (32px), so the full-size image never
// touches the edges of the viewport.
const imagePreviewViewportInset = '64px'

// NOTE: These filename extensions are based on render-media, the upstream
// library used to embed media files:
// https://github.com/feross/render-media/blob/a445b2ab90fcd4a248552d32027b2bc6a02600c8/index.js#L15-L72
//
// SECURITY: Keep this map restricted to inert raster image and audio MIME
// types. Files come from untrusted peers and their blob URLs live in the app's
// own origin, so a format that can carry script runs with full access to the
// app's storage when opened in its own tab. Active formats such as `.svg`
// (`image/svg+xml`), `.html`, `.xml`, and `.pdf` must stay out of this map.
export const inlineImageMimeTypes: Readonly<Record<string, string>> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
}

export const inlineAudioMimeTypes: Readonly<Record<string, string>> = {
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

export const inlineMediaMimeTypes: Readonly<Record<string, string>> = {
  ...inlineImageMimeTypes,
  ...inlineAudioMimeTypes,
}

const getNormalizedExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex <= 0) return ''

  return fileName.slice(lastDotIndex).toLowerCase()
}

export const getInlineMediaMimeType = (
  fileName: string
): string | undefined => {
  const extension = getNormalizedExtension(fileName)

  return Object.prototype.hasOwnProperty.call(inlineMediaMimeTypes, extension)
    ? inlineMediaMimeTypes[extension]
    : undefined
}

// Matches render-media's MAX_BLOB_LENGTH, which this component used to
// inherit through appendTo
const maxInlineMediaBytes = 200 * 1000 * 1000

const useBlobUrl = (
  file: Pick<TorrentFile, 'getBlob'>,
  mimeType: string | undefined
) => {
  const [url, setUrl] = useState<string>()
  const [didFail, setDidFail] = useState(false)

  useEffect(() => {
    setUrl(undefined)
    setDidFail(false)

    if (!mimeType) return undefined

    let isCurrent = true
    let blobUrl: string | undefined

    // Read the raw Blob from WebTorrent and rebuild it with our fixed
    // allowlisted MIME type rather than calling getBlobURL (which derives the
    // Content-Type from the peer-controlled filename).
    file.getBlob((err, rawBlob) => {
      if (err || !rawBlob) {
        if (isCurrent) setDidFail(true)
        return
      }

      if (!isCurrent) return

      const safeBlob = new Blob([rawBlob], { type: mimeType })
      const createdUrl = URL.createObjectURL(safeBlob)

      blobUrl = createdUrl
      setUrl(createdUrl)
    })

    return () => {
      isCurrent = false

      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [file, mimeType])

  return { url, didFail }
}

export const InlineFile = ({ file }: InlineFileProps) => {
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)

  const { name } = file
  const extension = getNormalizedExtension(name)
  const fixedMimeType = getInlineMediaMimeType(name)
  const isImage = Object.prototype.hasOwnProperty.call(
    inlineImageMimeTypes,
    extension
  )
  const isMediaSupported =
    fixedMimeType !== undefined && file.length <= maxInlineMediaBytes

  const { url, didFail } = useBlobUrl(
    file,
    isMediaSupported ? fixedMimeType : undefined
  )

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

export const InlineMedia = ({ magnetURI, fileKey }: InlineMediaProps) => {
  const {
    fileTransferService: { fileTransfer },
  } = useContext(RoomContext)

  return (
    <InlineMediaView
      download={useInlineMediaDownload(fileTransfer, { magnetURI, fileKey })}
    />
  )
}

interface InlineMediaViewProps {
  download: InlineMediaDownload
}

/** What a message shows for each stage of its media's download. */
export const InlineMediaView = ({ download }: InlineMediaViewProps) => {
  switch (download.state) {
    case InlineMediaDownloadState.LOADING:
      return <CircularProgress variant="indeterminate" color="inherit" />

    case InlineMediaDownloadState.FAILED:
      return (
        <Typography sx={{ fontStyle: 'italic' }}>
          Media failed to load
        </Typography>
      )

    case InlineMediaDownloadState.READY:
      return (
        <>
          {/* A share can hold two files with the same name, so the name
              alone is not a unique key. The list never reorders. */}
          {download.files.map((file, index) => (
            <InlineFile file={file} key={`${index}-${file.name}`} />
          ))}
        </>
      )
  }
}
