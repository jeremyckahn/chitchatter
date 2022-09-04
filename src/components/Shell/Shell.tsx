import {
  forwardRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
  SyntheticEvent,
} from 'react'
import { Link } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import { ThemeProvider, createTheme, styled } from '@mui/material/styles'
import Drawer from '@mui/material/Drawer'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import StepIcon from '@mui/material/StepIcon'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Home from '@mui/icons-material/Home'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'

import { ShellContext } from 'ShellContext'
import { AlertOptions } from 'models/shell'
import { PeerNameDisplay } from 'components/PeerNameDisplay'

export interface ShellProps extends PropsWithChildren {
  userPeerId: string
}

const drawerWidth = 240

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

const Main = styled('main', { shouldForwardProp: prop => prop !== 'open' })<{
  open?: boolean
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  paddingTop: 0,
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

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}))

export const Shell = ({ children, userPeerId }: ShellProps) => {
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

  const [mode, setMode] = useState<'light' | 'dark'>('dark')

  const handleColorModeToggleClick = () => {
    setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
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

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
  }

  return (
    <ShellContext.Provider value={shellContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          className="Chitchatter"
          sx={theme => ({
            height: '100vh',
            display: 'flex',
            paddingTop: theme.spacing(7),
          })}
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
              {doShowPeers ? (
                <Tooltip title="Number of peers in the room">
                  <StepIcon icon={numberOfPeers} sx={{ marginLeft: 'auto' }} />
                </Tooltip>
              ) : null}
            </Toolbar>
          </AppBar>
          <Drawer
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
            variant="persistent"
            anchor="left"
            open={isDrawerOpen}
          >
            <DrawerHeader>
              <IconButton onClick={handleDrawerClose} aria-label="Close menu">
                {theme.direction === 'ltr' ? (
                  <ChevronLeftIcon />
                ) : (
                  <ChevronRightIcon />
                )}
              </IconButton>
            </DrawerHeader>
            <Divider />
            <ListItem disablePadding>
              <ListItemText
                sx={{
                  padding: '1em 1.5em',
                }}
                primary={
                  <>
                    <Typography>Your user name: </Typography>
                    <PeerNameDisplay sx={{ fontWeight: 'bold' }}>
                      {userPeerId}
                    </PeerNameDisplay>
                  </>
                }
              />
            </ListItem>
            <Divider />
            <List role="navigation">
              <Link to="/">
                <ListItem disablePadding>
                  <ListItemButton>
                    <ListItemIcon>
                      <Home />
                    </ListItemIcon>
                    <ListItemText primary="Home" />
                  </ListItemButton>
                </ListItem>
              </Link>
              <ListItem disablePadding>
                <ListItemButton onClick={handleColorModeToggleClick}>
                  <ListItemIcon>
                    {theme.palette.mode === 'dark' ? (
                      <Brightness7Icon />
                    ) : (
                      <Brightness4Icon />
                    )}
                  </ListItemIcon>
                  <ListItemText primary="Change theme" />
                </ListItemButton>
              </ListItem>
            </List>
            <Divider />
          </Drawer>
          <Main open={isDrawerOpen}>{children}</Main>
        </Box>
      </ThemeProvider>
    </ShellContext.Provider>
  )
}
