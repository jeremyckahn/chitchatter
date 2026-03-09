import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import ErrorIcon from '@mui/icons-material/Error'
import Typography from '@mui/material/Typography'
import useTheme from '@mui/material/styles/useTheme'
import { useTranslation } from 'react-i18next'

const { isSecureContext, RTCDataChannel } = window
const doesSupportWebRtc = RTCDataChannel !== undefined

export const isEnvironmentSupported =
  (isSecureContext && doesSupportWebRtc) || import.meta.env.MODE === 'test'

export const EnvironmentUnsupportedDialog = () => {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Dialog
      open={!isEnvironmentSupported}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ErrorIcon
            fontSize="medium"
            sx={() => ({
              color: theme.palette.error.main,
              mr: theme.spacing(1),
            })}
          />
          {t('environmentUnsupported.title')}
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {t('environmentUnsupported.message')}
        </DialogContentText>
        <Typography
          component="ul"
          sx={{
            color: theme.palette.text.secondary,
            m: 1,
          }}
        >
          {!isSecureContext ? (
            <li>{t('environmentUnsupported.insecureContext')}</li>
          ) : null}
          {!doesSupportWebRtc ? (
            <li>{t('environmentUnsupported.noWebRTC')}</li>
          ) : null}
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
