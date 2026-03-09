import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  TransferredFile,
  fileTransferGetOffered,
} from 'services/FileTransfer/FileTransfer'

interface InlineMediaProps {
  magnetURI: string
}

const supportedImageTypes = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/webp',
]

const supportedAudioTypes = [
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/aac',
  'audio/flac',
]

const supportedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']

const InlineFileDisplay = ({ file }: { file: TransferredFile }) => {
  const { t } = useTranslation()
  const { metadata, url } = file

  if (supportedImageTypes.includes(metadata.type)) {
    return (
      <Box sx={{ '& img': { maxWidth: '100%', borderRadius: 1 } }}>
        <img src={url} alt={metadata.name} />
      </Box>
    )
  }

  if (supportedAudioTypes.includes(metadata.type)) {
    return (
      <Box>
        <audio controls src={url} />
      </Box>
    )
  }

  if (supportedVideoTypes.includes(metadata.type)) {
    return (
      <Box sx={{ '& video': { maxWidth: '100%', borderRadius: 1 } }}>
        <video controls src={url} />
      </Box>
    )
  }

  return (
    <Typography sx={{ fontStyle: 'italic' }}>
      {t('media.previewNotSupported')} ({metadata.name})
    </Typography>
  )
}

export const InlineMedia = ({ magnetURI }: InlineMediaProps) => {
  const [files, setFiles] = useState<TransferredFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const check = () => {
      const found = fileTransferGetOffered(magnetURI)
      if (found.length > 0) {
        setFiles(found)
        setIsLoading(false)
        return true
      }
      return false
    }

    if (check()) return

    // Poll briefly for incoming file data
    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      if (check() || attempts > 30) {
        clearInterval(interval)
        setIsLoading(false)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [magnetURI])

  if (isLoading) {
    return (
      <CircularProgress variant="indeterminate" color="inherit" size={20} />
    )
  }

  if (files.length === 0) {
    return null
  }

  return (
    <>
      {files.map(file => (
        <InlineFileDisplay file={file} key={file.metadata.name} />
      ))}
    </>
  )
}
