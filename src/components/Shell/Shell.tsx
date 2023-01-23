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
import { RoomShareDialog } from './RoomShareDialog'

export interface ShellProps extends PropsWithChildren {
  userPeerId: string
  appNeedsUpdate: boolean
}

export const Shell = ({ appNeedsUpdate, children, userPeerId }: ShellProps) => {
  const settingsContext = useContext(SettingsContext)
  const [isAlertShowing, setIsAlertShowing] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false)
  const [isRoomShareDialogOpen, setIsRoomShareDialogOpen] = useState(false)
  const [doShowPeers, setDoShowPeers] = useState(false)
  const [alertSeverity, setAlertSeverity] = useState<AlertColor>('info')
  const [showAppBar, setShowAppBar] = useState(true)
  const [showRoomControls, setShowRoomControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [title, setTitle] = useState('')
  const [alertText, setAlertText] = useState('')
  const [numberOfPeers, setNumberOfPeers] = useState(1)
  const [roomId, setRoomId] = useState<string | undefined>(undefined)
  const [password, setPassword] = useState<string | undefined>(undefined)
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
      showRoomControls,
      setShowRoomControls,
      setTitle,
      showAlert,
      isPeerListOpen,
      setIsQRCodeDialogOpen,
      roomId,
      setRoomId,
      password,
      setPassword,
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
      roomId,
      setRoomId,
      password,
      setPassword,
      numberOfPeers,
      peerList,
      tabHasFocus,
      setDoShowPeers,
      setNumberOfPeers,
      showRoomControls,
      setShowRoomControls,
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

  const enterFullscreen = () => {
    const body: any = document.body
    if (body.requestFullscreen) {
      body.requestFullscreen().catch()
    } else if (body.webkitRequestFullscreen) {
      body.webkitRequestFullscreen().catch()
    } else if (body.mozRequestFullScreen) {
      body.mozRequestFullScreen().catch()
    } else if (body.msRequestFullscreen) {
      body.msRequestFullscreen().catch()
    }
  }

  const exitFullscreen = () => {
    const document: any = window.document
    if (document.exitFullscreen) {
      document.exitFullscreen().catch()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen().catch()
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen().catch()
    } else if (document.msExitFullScreen) {
      document.msExitFullScreen().catch()
    }
  }

  useEffect(() => {
    if (isFullscreen) {
      enterFullscreen()
      setShowRoomControls(false)
      setShowAppBar(false)
    } else {
      exitFullscreen()
      setShowAppBar(true)
      setShowRoomControls(true)
    }
  }, [isFullscreen, setShowRoomControls, setShowAppBar])

  useEffect(() => {
    if (isFullscreen) setShowAppBar(showRoomControls)
  }, [isFullscreen, showRoomControls, setShowAppBar])

  useEffect(() => {
    const handleFocus = () => {
      setTabHasFocus(true)
    }
    const handleBlur = () => {
      setTabHasFocus(false)
    }
    const handleFullscreen = (event: Event) => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreen)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('fullscreenchange', handleFullscreen)
    }
  }, [])

  const handleDrawerOpen = () => {
    setIsDrawerOpen(true)
  }

  const handlePeerListClick = () => {
    setIsPeerListOpen(!isPeerListOpen)
  }

  const copyToClipboard = async (
    content: string,
    alert: string,
    severity: AlertColor = 'success'
  ) => {
    await navigator.clipboard.writeText(content)
    shellContextValue.showAlert(alert, { severity })
  }

  const handleLinkButtonClick = async () => {
    if (roomId !== undefined && password !== undefined) {
      setIsRoomShareDialogOpen(true)
    } else {
      copyToClipboard(window.location.href, 'Current URL copied to clipboard')
    }
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

  const handleRoomShareDialogClose = () => {
    setIsRoomShareDialogOpen(false)
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
            onRoomControlsClick={() => setShowRoomControls(!showRoomControls)}
            setIsQRCodeDialogOpen={setIsQRCodeDialogOpen}
            showAppBar={showAppBar}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
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
            showAppBar={showAppBar}
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
          <RoomShareDialog
            isOpen={isRoomShareDialogOpen}
            handleClose={handleRoomShareDialogClose}
            roomId={roomId ?? ''}
            password={password ?? ''}
            showAlert={showAlert}
            copyToClipboard={copyToClipboard}
          />
        </Box>
      </ThemeProvider>
    </ShellContext.Provider>
  )
}
