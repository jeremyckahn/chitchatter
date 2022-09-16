import {
  PropsWithChildren,
  SyntheticEvent,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme, styled } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { AlertOptions } from 'models/shell'

import { Drawer, drawerWidth } from './Drawer'
import { UpgradeDialog } from './UpgradeDialog'
import { DrawerHeader } from './DrawerHeader'
import { ShellAppBar } from './ShellAppBar'

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

const Main = styled('main', { shouldForwardProp: prop => prop !== 'open' })<{
  open?: boolean
}>(({ theme, open }) => ({
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}))

export interface ShellProps extends PropsWithChildren {
  userPeerId: string
  appNeedsUpdate: boolean
}

export const Shell = ({ appNeedsUpdate, children, userPeerId }: ShellProps) => {
  const settingsContext = useContext(SettingsContext)
  const [isAlertShowing, setIsAlertShowing] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [doShowPeers, setDoShowPeers] = useState(false)
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
    () => ({
      numberOfPeers,
      setDoShowPeers,
      setNumberOfPeers,
      setTitle,
      showAlert,
    }),
    [numberOfPeers, setDoShowPeers, setNumberOfPeers, setTitle, showAlert]
  )

  const colorMode = settingsContext.getUserSettings().colorMode

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode,
        },
      }),
    [colorMode]
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

  const handleDrawerOpen = () => {
    setIsDrawerOpen(true)
  }

  const handleLinkButtonClick = async () => {
    await navigator.clipboard.writeText(window.location.href)

    shellContextValue.showAlert('Current URL copied to clipboard', {
      severity: 'success',
    })
  }

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
  }

  const handleHomeLinkClick = () => {
    setIsDrawerOpen(false)
  }

  return (
    <ShellContext.Provider value={shellContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UpgradeDialog appNeedsUpdate={appNeedsUpdate} />
        <Box
          className="Chitchatter"
          sx={{
            height: '100vh',
            display: 'flex',
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
          <ShellAppBar
            doShowPeers={doShowPeers}
            handleDrawerOpen={handleDrawerOpen}
            handleLinkButtonClick={handleLinkButtonClick}
            isDrawerOpen={isDrawerOpen}
            numberOfPeers={numberOfPeers}
            title={title}
          />
          <Drawer
            isDrawerOpen={isDrawerOpen}
            onDrawerClose={handleDrawerClose}
            onHomeLinkClick={handleHomeLinkClick}
            theme={theme}
            userPeerId={userPeerId}
          />
          <Main
            open={isDrawerOpen}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            <DrawerHeader />
            <Box sx={{ overflow: 'auto', flexGrow: 1 }}>{children}</Box>
          </Main>
        </Box>
      </ThemeProvider>
    </ShellContext.Provider>
  )
}
