import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material'
import React from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { QRCode } from 'react-qrcode-logo'

const QR_CODE_SIZE = 256
const QR_IMAGE_OPACITY = 0.3

export interface QRCodeDialogProps {
  isOpen: boolean
  handleClose: () => void
}

export function QRCodeDialog({ isOpen, handleClose }: QRCodeDialogProps) {
  const url = window.location.href
  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        Room QR Code
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <QRCode
          value={url}
          size={QR_CODE_SIZE}
          logoImage={'/logo512.png'}
          logoWidth={QR_CODE_SIZE}
          logoHeight={QR_CODE_SIZE}
          logoOpacity={QR_IMAGE_OPACITY}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} autoFocus>
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  )
}
