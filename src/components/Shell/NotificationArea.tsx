import { forwardRef } from 'react'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert'

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
  }
)

interface NotificationAreaProps {
  alertSeverity: AlertColor
  alertText: string
  isAlertShowing: boolean
  onAlertClose: () => void
}

export const NotificationArea = ({
  alertSeverity,
  alertText,
  isAlertShowing,
  onAlertClose,
}: NotificationAreaProps) => {
  return (
    <Snackbar
      open={isAlertShowing}
      autoHideDuration={6000}
      onClose={onAlertClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={onAlertClose} severity={alertSeverity} variant="standard">
        {alertText}
      </Alert>
    </Snackbar>
  )
}
