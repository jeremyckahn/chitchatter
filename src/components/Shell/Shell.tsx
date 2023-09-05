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
import { useWindowSize } from '@react-hook/window-size'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { AlertOptions } from 'models/shell'
import { AudioState, ScreenShareState, VideoState, Peer } from 'models/chat'
import { ErrorBoundary } from 'components/ErrorBoundary'

import { PeerConnectionType } from 'services/PeerRoom/PeerRoom'

import { Drawer } from './Drawer'
import { UpgradeDialog } from './UpgradeDialog'
import { ShellAppBar } from './ShellAppBar'
import { NotificationArea } from './NotificationArea'
import { RouteContent } from './RouteContent'
import { PeerList } from './PeerList'
import { QRCodeDialog } from './QRCodeDialog'
import { RoomShareDialog } from './RoomShareDialog'
import { useConnectionTest } from './useConnectionTest'
import { ServerConnectionFailureDialog } from './ServerConnectionFailureDialog'
import {
  EnvironmentUnsupportedDialog,
  isEnvironmentSupported,
} from './EnvironmentUnsupportedDialog'

export interface ShellProps extends PropsWithChildren {
  userPeerId: string
  appNeedsUpdate: boolean
}

export const Shell = ({ appNeedsUpdate, children, userPeerId }: ShellProps) => {
  const { getUserSettings, updateUserSettings } = useContext(SettingsContext)

  const { colorMode } = getUserSettings()

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode,
        },
      }),
    [colorMode]
  )

  const [windowWidth] = useWindowSize()
  const defaultSidebarsOpen = windowWidth >= theme.breakpoints.values.lg

  const [isAlertShowing, setIsAlertShowing] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(defaultSidebarsOpen)
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false)
  const [isRoomShareDialogOpen, setIsRoomShareDialogOpen] = useState(false)
  const [alertSeverity, setAlertSeverity] = useState<AlertColor>('info')
  const [showAppBar, setShowAppBar] = useState(true)
  const [showRoomControls, setShowRoomControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [title, setTitle] = useState('')
  const [alertText, setAlertText] = useState('')
  const [roomId, setRoomId] = useState<string | undefined>(undefined)
  const [password, setPassword] = useState<string | undefined>(undefined)
  const [isPeerListOpen, setIsPeerListOpen] = useState(defaultSidebarsOpen)
  const [peerList, setPeerList] = useState<Peer[]>([]) // except self
  const [
    isServerConnectionFailureDialogOpen,
    setIsServerConnectionFailureDialogOpen,
  ] = useState(false)
  const [peerConnectionTypes, setPeerConnectionTypes] = useState<
    Record<string, PeerConnectionType>
  >({})
  const [tabHasFocus, setTabHasFocus] = useState(true)
  const [audioState, setAudioState] = useState<AudioState>(AudioState.STOPPED)
  const [videoState, setVideoState] = useState<VideoState>(VideoState.STOPPED)
  const [screenState, setScreenState] = useState<ScreenShareState>(
    ScreenShareState.NOT_SHARING
  )
  const [customUsername, setCustomUsername] = useState(
    getUserSettings().customUsername
  )
  const [peerAudios, setPeerAudios] = useState<
    Record<string, HTMLAudioElement>
  >({})

  const showAlert = useCallback((message: string, options?: AlertOptions) => {
    setAlertText(message)
    setAlertSeverity(options?.severity ?? 'info')
    setIsAlertShowing(true)
  }, [])

  const { connectionTestResults } = useConnectionTest()

  const updatePeer = useCallback(
    (peerId: string, updatedProperties: Partial<Peer>) => {
      const peerIndex = peerList.findIndex(peer => peer.peerId === peerId)
      const doesPeerExist = peerIndex !== -1

      if (!doesPeerExist) return

      const peerListClone = [...peerList]
      const peer = peerList[peerIndex]
      peerListClone[peerIndex] = { ...peer, ...updatedProperties }
      setPeerList(peerListClone)
    },
    [peerList]
  )

  const shellContextValue = useMemo(
    () => ({
      tabHasFocus,
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
      isServerConnectionFailureDialogOpen,
      setIsServerConnectionFailureDialogOpen,
      peerConnectionTypes,
      setPeerConnectionTypes,
      audioState,
      setAudioState,
      videoState,
      setVideoState,
      screenState,
      setScreenState,
      peerAudios,
      setPeerAudios,
      customUsername,
      setCustomUsername,
      connectionTestResults,
      updatePeer,
    }),
    [
      isPeerListOpen,
      setIsQRCodeDialogOpen,
      roomId,
      setRoomId,
      password,
      setPassword,
      peerList,
      isServerConnectionFailureDialogOpen,
      setIsServerConnectionFailureDialogOpen,
      peerConnectionTypes,
      tabHasFocus,
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
      peerAudios,
      setPeerAudios,
      customUsername,
      setCustomUsername,
      connectionTestResults,
      updatePeer,
    ]
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
    if (customUsername === getUserSettings().customUsername) return

    updateUserSettings({ customUsername })
  }, [customUsername, getUserSettings, updateUserSettings])

  useEffect(() => {
    document.title = title
  }, [title])

  const enterFullscreen = async () => {
    const body: any = document.body

    try {
      if (body.requestFullscreen) {
        await body.requestFullscreen()
      } else if (body.webkitRequestFullscreen) {
        await body.webkitRequestFullscreen()
      } else if (body.mozRequestFullScreen) {
        await body.mozRequestFullScreen()
      } else if (body.msRequestFullscreen) {
        await body.msRequestFullscreen()
      }
    } catch (e) {
      // Silence harmless errors
    }
  }

  const exitFullscreen = async () => {
    const document: any = window.document
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen()
      } else if (document.msExitFullScreen) {
        await document.msExitFullScreen()
      }
    } catch (e) {
      // Silence harmless errors
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
    const handleFullscreen = () => {
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

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
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
        {isEnvironmentSupported ? (
          <>
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
                onDrawerOpen={handleDrawerOpen}
                onLinkButtonClick={handleLinkButtonClick}
                isDrawerOpen={isDrawerOpen}
                isPeerListOpen={isPeerListOpen}
                title={title}
                onPeerListClick={handlePeerListClick}
                onRoomControlsClick={() =>
                  setShowRoomControls(!showRoomControls)
                }
                setIsQRCodeDialogOpen={setIsQRCodeDialogOpen}
                showAppBar={showAppBar}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
              />
              <Drawer
                isDrawerOpen={isDrawerOpen}
                onDrawerClose={handleDrawerClose}
                theme={theme}
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
                roomId={roomId}
                isPeerListOpen={isPeerListOpen}
                onPeerListClose={handlePeerListClick}
                peerList={peerList}
                peerConnectionTypes={peerConnectionTypes}
                audioState={audioState}
                peerAudios={peerAudios}
                connectionTestResults={connectionTestResults}
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
              <ServerConnectionFailureDialog />
            </Box>
          </>
        ) : (
          <EnvironmentUnsupportedDialog />
        )}
      </ThemeProvider>
    </ShellContext.Provider>
  )
}
