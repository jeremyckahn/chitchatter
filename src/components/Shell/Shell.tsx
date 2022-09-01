import {
  forwardRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
  SyntheticEvent,
} from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import StepIcon from '@mui/material/StepIcon'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert'

import { ShellContext } from 'ShellContext'
import { AlertOptions } from 'models/shell'

interface ShellProps extends PropsWithChildren {}

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

export const Shell = ({ children }: ShellProps) => {
  const [isAlertShowing, setIsAlertShowing] = useState(false)
  const [alertSeverity, setAlertSeverity] = useState<AlertColor>('info')
  const [title, setTitle] = useState('')
  const [alertText, setAlertText] = useState('')
  const [numberOfPeers, setNumberOfPeers] = useState(1)

  const showAlert = useCallback<
    (message: string, options?: AlertOptions) => void
  >((message, options) => {
    setAlertText(message)
    setAlertSeverity(options?.severity ?? 'info')
    setIsAlertShowing(true)
  }, [])

  const shellContextValue = useMemo(
    () => ({ numberOfPeers, setNumberOfPeers, setTitle, showAlert }),
    [numberOfPeers, setNumberOfPeers, setTitle, showAlert]
  )

  const handleAlertClose = (
    _event?: SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return
    }

    setIsAlertShowing(false)
  }

  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <ShellContext.Provider value={shellContextValue}>
      <Box
        className="Chitchatter"
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 8,
        }}
      >
        <Snackbar
          open={isAlertShowing}
          autoHideDuration={6000}
          onClose={handleAlertClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleAlertClose}
            severity={alertSeverity}
            variant="standard"
          >
            {alertText}
          </Alert>
        </Snackbar>
        <AppBar position="fixed">
          <Toolbar
            variant="regular"
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6">{title}</Typography>
            <Tooltip title="Number of peers in the room">
              <StepIcon icon={numberOfPeers} sx={{ marginLeft: 'auto' }} />
            </Tooltip>
          </Toolbar>
        </AppBar>
        {children}
      </Box>
    </ShellContext.Provider>
  )
}
