import {
  PropsWithChildren,
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import { AlertColor } from '@mui/material/Alert'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { AlertOptions } from 'models/shell'
import { AudioState, ScreenShareState, VideoState, Peer } from 'models/chat'
import { ErrorBoundary } from 'components/ErrorBoundary'

import { Drawer } from './Drawer'
import { UpgradeDialog } from './UpgradeDialog'
import { ShellAppBar } from './ShellAppBar'
import { NotificationArea } from './NotificationArea'
import { RouteContent } from './RouteContent'
import { PeerList } from './PeerList'
import { QRCodeDialog } from './QRCodeDialog'

export interface ShellProps extends PropsWithChildren {
  userPeerId: string
  appNeedsUpdate: boolean
}

export const Shell = ({ appNeedsUpdate, children, userPeerId }: ShellProps) => {
  const settingsContext = useContext(SettingsContext)
  const [isAlertShowing, setIsAlertShowing] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false)
  const [doShowPeers, setDoShowPeers] = useState(false)
  const [alertSeverity, setAlertSeverity] = useState<AlertColor>('info')
  const [title, setTitle] = useState('')
  const [alertText, setAlertText] = useState('')
  const [numberOfPeers, setNumberOfPeers] = useState(1)
  const [isPeerListOpen, setIsPeerListOpen] = useState(false)
  const [peerList, setPeerList] = useState<Peer[]>([]) // except you
  const [tabHasFocus, setTabHasFocus] = useState(true)
  const [audioState, setAudioState] = useState<AudioState>(AudioState.STOPPED)
  const [videoState, setVideoState] = useState<VideoState>(VideoState.STOPPED)
  const [screenState, setScreenState] = useState<ScreenShareState>(
    ScreenShareState.NOT_SHARING
  )
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
      tabHasFocus,
      setDoShowPeers,
      setNumberOfPeers,
      setTitle,
      showAlert,
      isPeerListOpen,
      setIsQRCodeDialogOpen,
      setIsPeerListOpen,
      peerList,
      setPeerList,
      audioState,
      setAudioState,
      videoState,
      setVideoState,
      screenState,
      setScreenState,
    }),
    [
      isPeerListOpen,
      setIsQRCodeDialogOpen,
      numberOfPeers,
      peerList,
      tabHasFocus,
      setDoShowPeers,
      setNumberOfPeers,
      setTitle,
      showAlert,
      audioState,
      setAudioState,
      videoState,
      setVideoState,
      screenState,
      setScreenState,
    ]
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

  useEffect(() => {
    const handleFocus = () => {
      setTabHasFocus(true)
    }
    const handleBlur = () => {
      setTabHasFocus(false)
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const handleDrawerOpen = () => {
    setIsDrawerOpen(true)
  }

  const handlePeerListClick = () => {
    setIsPeerListOpen(!isPeerListOpen)
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

  const handleAboutLinkClick = () => {
    setIsDrawerOpen(false)
  }

  const handleDisclaimerLinkClick = () => {
    setIsDrawerOpen(false)
  }

  const handleSettingsLinkClick = () => {
    setIsDrawerOpen(false)
  }

  const handleQRCodeDialogClose = () => {
    setIsQRCodeDialogOpen(false)
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
          <NotificationArea
            alertSeverity={alertSeverity}
            alertText={alertText}
            isAlertShowing={isAlertShowing}
            onAlertClose={handleAlertClose}
          />
          <ShellAppBar
            doShowPeers={doShowPeers}
            onDrawerOpen={handleDrawerOpen}
            onLinkButtonClick={handleLinkButtonClick}
            isDrawerOpen={isDrawerOpen}
            isPeerListOpen={isPeerListOpen}
            numberOfPeers={numberOfPeers}
            title={title}
            onPeerListClick={handlePeerListClick}
            setIsQRCodeDialogOpen={setIsQRCodeDialogOpen}
          />
          <Drawer
            isDrawerOpen={isDrawerOpen}
            onAboutLinkClick={handleAboutLinkClick}
            onDisclaimerClick={handleDisclaimerLinkClick}
            onDrawerClose={handleDrawerClose}
            onHomeLinkClick={handleHomeLinkClick}
            onSettingsLinkClick={handleSettingsLinkClick}
            theme={theme}
            userPeerId={userPeerId}
          />
          <RouteContent
            isDrawerOpen={isDrawerOpen}
            isPeerListOpen={isPeerListOpen}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
          </RouteContent>
          <PeerList
            userId={userPeerId}
            isPeerListOpen={isPeerListOpen}
            onPeerListClose={handlePeerListClick}
            peerList={peerList}
            audioState={audioState}
          />
          <QRCodeDialog
            isOpen={isQRCodeDialogOpen}
            handleClose={handleQRCodeDialogClose}
          />
        </Box>
      </ThemeProvider>
    </ShellContext.Provider>
  )
}
