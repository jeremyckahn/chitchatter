import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import ErrorIcon from '@mui/icons-material/Error'
import Typography from '@mui/material/Typography'
import useTheme from '@mui/material/styles/useTheme'
import Link from '@mui/material/Link'

const { isSecureContext, RTCDataChannel } = window
const doesSupportWebRtc = RTCDataChannel !== undefined

export const isEnvironmentSupported =
  (isSecureContext && doesSupportWebRtc) || import.meta.env.MODE === 'test'

export const EnvironmentUnsupportedDialog = () => {
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
            sx={theme => ({
              color: theme.palette.error.main,
              mr: theme.spacing(1),
            })}
          />
          Environment unsupported
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Chitchatter is unable to start up. The following issues were detected:
        </DialogContentText>
        <Typography
          component="ul"
          sx={{
            color: theme.palette.text.secondary,
            m: 1,
          }}
        >
          {!isSecureContext ? (
            <li>
              The app is not being served from a{' '}
              <Link
                href="https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts"
                rel="noreferrer"
                target="_blank"
              >
                secure context
              </Link>
              .
            </li>
          ) : null}
          {!doesSupportWebRtc ? (
            <li>
              Your browser does not support WebRTC. Consider using{' '}
              <Link
                href="https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection#browser_compatibility"
                rel="noreferrer"
                target="_blank"
              >
                a browser that does
              </Link>
              .
            </li>
          ) : null}
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
