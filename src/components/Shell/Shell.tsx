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
import { ThemeProvider } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { AlertColor } from '@mui/material/Alert'
import MuiDrawer from '@mui/material/Drawer'
import Link from '@mui/material/Link'
import { useWindowSize } from '@react-hook/window-size'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { AlertOptions, QueryParamKeys } from 'models/shell'
import {
  AudioState,
  ScreenShareState,
  VideoState,
  Peer,
  AudioChannel,
  PeerAudioChannelState,
  AudioChannelName,
} from 'models/chat'
import { ErrorBoundary } from 'components/ErrorBoundary'
import { PeerConnectionType } from 'lib/PeerRoom'

import { Drawer } from './Drawer'
import { UpgradeDialog } from './UpgradeDialog'
import { ShellAppBar } from './ShellAppBar'
import { NotificationArea } from './NotificationArea'
import { RouteContent } from './RouteContent'
import { PeerList, peerListWidth } from './PeerList'
import { QRCodeDialog } from './QRCodeDialog'
import { RoomShareDialog } from './RoomShareDialog'
import { useConnectionTest } from './useConnectionTest'
import { ServerConnectionFailureDialog } from './ServerConnectionFailureDialog'
import {
  EnvironmentUnsupportedDialog,
  isEnvironmentSupported,
} from './EnvironmentUnsupportedDialog'
import { useShellTheme } from './useShellTheme'

export interface ShellProps extends PropsWithChildren {
  userPeerId: string
  appNeedsUpdate: boolean
}

const queryParams = new URLSearchParams(window.location.search)

export const Shell = ({ appNeedsUpdate, children, userPeerId }: ShellProps) => {
  const { getUserSettings, updateUserSettings } = useContext(SettingsContext)
  const isEmbedded = queryParams.get(QueryParamKeys.IS_EMBEDDED) !== null

  const theme = useShellTheme()

  const [windowWidth] = useWindowSize()
  const defaultSidebarsOpen = windowWidth >= theme.breakpoints.values.lg

  const [isAlertShowing, setIsAlertShowing] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(defaultSidebarsOpen)
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false)
  const [isRoomShareDialogOpen, setIsRoomShareDialogOpen] = useState(false)
  const [alertSeverity, setAlertSeverity] = useState<AlertColor>('info')
  const [showAppBar, setShowAppBar] = useState(true)
  const [showRoomControls, setShowRoomControls] = useState(!isEmbedded)
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
  const [audioChannelState, setAudioChannelState] =
    useState<PeerAudioChannelState>({
      [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
      [AudioChannelName.SCREEN_SHARE]: AudioState.STOPPED,
    })
  const [videoState, setVideoState] = useState<VideoState>(VideoState.STOPPED)
  const [screenState, setScreenState] = useState<ScreenShareState>(
    ScreenShareState.NOT_SHARING
  )
  const [customUsername, setCustomUsername] = useState(
    getUserSettings().customUsername
  )
  const [peerAudioChannels, setPeerAudioChannels] = useState<
    Record<string, AudioChannel>
  >({})

  const showAlert = useCallback((message: string, options?: AlertOptions) => {
    setAlertText(message)
    setAlertSeverity(options?.severity ?? 'info')
    setIsAlertShowing(true)
  }, [])

  const { connectionTestResults } = useConnectionTest()

  const updatePeer = useCallback(
    (peerId: string, updatedProperties: Partial<Peer>) => {
      setPeerList(peerList => {
        const peerIndex = peerList.findIndex(peer => peer.peerId === peerId)
        const doesPeerExist = peerIndex !== -1

        if (!doesPeerExist) return peerList

        const peerListClone = [...peerList]
        const peer = peerList[peerIndex]
        peerListClone[peerIndex] = { ...peer, ...updatedProperties }
        return peerListClone
      })
    },
    []
  )

  const shellContextValue = useMemo(
    () => ({
      isEmbedded,
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
      audioChannelState,
      setAudioChannelState,
      videoState,
      setVideoState,
      screenState,
      setScreenState,
      peerAudioChannels,
      setPeerAudioChannels,
      customUsername,
      setCustomUsername,
      connectionTestResults,
      updatePeer,
    }),
    [
      isEmbedded,
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
      audioChannelState,
      setAudioChannelState,
      videoState,
      setVideoState,
      screenState,
      setScreenState,
      peerAudioChannels,
      setPeerAudioChannels,
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

      if (!isEmbedded) {
        setShowRoomControls(true)
      }
    }
  }, [isFullscreen, setShowRoomControls, setShowAppBar, isEmbedded])

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
                isDrawerOpen={isEmbedded ? false : isDrawerOpen}
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
              {isEmbedded ? null : (
                <Drawer
                  isDrawerOpen={isDrawerOpen}
                  onDrawerClose={handleDrawerClose}
                  theme={theme}
                />
              )}
              <RouteContent
                isDrawerOpen={isEmbedded ? true : isDrawerOpen}
                isPeerListOpen={isPeerListOpen}
                showAppBar={showAppBar}
              >
                <ErrorBoundary>{children}</ErrorBoundary>
              </RouteContent>
              <MuiDrawer
                sx={{
                  flexShrink: 0,
                  pointerEvents: 'none',
                  width: peerListWidth,
                  '& .MuiDrawer-paper': {
                    width: peerListWidth,
                    boxSizing: 'border-box',
                  },
                  ...(isPeerListOpen && {
                    pointerEvents: 'auto',
                  }),
                }}
                variant="persistent"
                anchor="right"
                open={isPeerListOpen}
              >
                <PeerList
                  userId={userPeerId}
                  roomId={roomId}
                  onPeerListClose={handlePeerListClick}
                  peerList={peerList}
                  peerConnectionTypes={peerConnectionTypes}
                  peerAudioChannelState={audioChannelState}
                  peerAudioChannels={peerAudioChannels}
                  connectionTestResults={connectionTestResults}
                />
                {isEmbedded ? (
                  <Typography
                    variant="caption"
                    sx={{
                      padding: '1em 1em 1.75em 1em',
                      textAlign: 'center',
                    }}
                  >
                    This conversation is powered by{' '}
                    <Link
                      href="https://github.com/jeremyckahn/chitchatter"
                      target="_blank"
                    >
                      Chitchatter
                    </Link>
                  </Typography>
                ) : null}
              </MuiDrawer>
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
