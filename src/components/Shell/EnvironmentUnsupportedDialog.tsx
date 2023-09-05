import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import ErrorIcon from '@mui/icons-material/Error'

const { isSecureContext, RTCDataChannel } = window
export const isEnvironmentSupported =
  (isSecureContext === true && RTCDataChannel !== undefined) ||
  process.env.NODE_ENV === 'test'

export const EnvironmentUnsupportedDialog = () => {
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
          TODO: Add details about unsupported environment
        </DialogContentText>
      </DialogContent>
    </Dialog>
  )
}
