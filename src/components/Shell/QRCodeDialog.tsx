import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { QRCode } from 'react-qrcode-logo'
import { useTranslation } from 'react-i18next'

const QR_CODE_SIZE = 256
const QR_IMAGE_OPACITY = 0.3

export interface QRCodeDialogProps {
  isOpen: boolean
  handleClose: () => void
}

export const QRCodeDialog = ({ isOpen, handleClose }: QRCodeDialogProps) => {
  const { t } = useTranslation()
  const url = window.location.href

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {t('qrCodeDialog.title')}
        <IconButton
          aria-label={t('common.close')}
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
          {t('common.dismiss')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
