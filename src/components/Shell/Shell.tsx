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
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import { ThemeProvider, createTheme, styled } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import StepIcon from '@mui/material/StepIcon'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import MenuIcon from '@mui/icons-material/Menu'
import WarningIcon from '@mui/icons-material/Warning'
import LinkIcon from '@mui/icons-material/Link'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { AlertOptions } from 'models/shell'

import { Drawer, drawerWidth } from './Drawer'
import { DrawerHeader } from './DrawerHeader'

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

interface AppBarProps extends MuiAppBarProps {
  open?: boolean
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: prop => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
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

  const handleRestartClick = () => {
    window.location.reload()
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
        <Dialog
          open={appNeedsUpdate}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon
                fontSize="medium"
                sx={theme => ({
                  color: theme.palette.warning.main,
                  mr: theme.spacing(1),
                })}
              />
              Update needed
            </Box>
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              In order to function properly, Chitchatter needs to be updated.
              The update has already been installed in the background. All you
              need to do is reload the page or click "Refresh" below.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleRestartClick} autoFocus>
              Refresh
            </Button>
          </DialogActions>
        </Dialog>
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
          <AppBar position="fixed" open={isDrawerOpen}>
            <Toolbar
              variant="regular"
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="Open menu"
                sx={{ mr: 2, ...(isDrawerOpen && { display: 'none' }) }}
                onClick={handleDrawerOpen}
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{ marginRight: 'auto' }}
              >
                {title}
              </Typography>
              <Tooltip title="Copy current URL">
                <IconButton
                  size="large"
                  edge="start"
                  color="inherit"
                  aria-label="Copy current URL"
                  sx={{ ml: 'auto' }}
                  onClick={handleLinkButtonClick}
                >
                  <LinkIcon />
                </IconButton>
              </Tooltip>
              {doShowPeers ? (
                <Tooltip title="Number of peers in the room">
                  <StepIcon icon={numberOfPeers} sx={{ ml: 2 }} />
                </Tooltip>
              ) : null}
            </Toolbar>
          </AppBar>
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
