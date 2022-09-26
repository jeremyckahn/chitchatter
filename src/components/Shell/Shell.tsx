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
import { Peer } from 'models/chat'

import { Drawer } from './Drawer'
import { UpgradeDialog } from './UpgradeDialog'
import { ShellAppBar } from './ShellAppBar'
import { NotificationArea } from './NotificationArea'
import { RouteContent } from './RouteContent'
import { PeerList } from './PeerList'

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
  const [isPeerListOpen, setIsPeerListOpen] = useState(false)
  const [peerList, setPeerList] = useState<Peer[]>([]) // except you

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
      isPeerListOpen,
      setIsPeerListOpen,
      peerList,
      setPeerList,
    }),
    [isPeerListOpen, numberOfPeers, peerList, showAlert]
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

  const handlePeerListOpen = () => {
    setIsPeerListOpen(true)
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

  const handlePeerListClose = () => {
    setIsPeerListOpen(false)
  }

  const handleHomeLinkClick = () => {
    setIsDrawerOpen(false)
  }

  const handleAboutLinkClick = () => {
    setIsDrawerOpen(false)
  }

  const handleSettingsLinkClick = () => {
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
            onPeerListOpen={handlePeerListOpen}
          />
          <Drawer
            isDrawerOpen={isDrawerOpen}
            onAboutLinkClick={handleAboutLinkClick}
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
            {children}
          </RouteContent>
          <PeerList
            userId={userPeerId}
            isPeerListOpen={isPeerListOpen}
            onPeerListClose={handlePeerListClose}
            peerList={peerList}
          />
        </Box>
      </ThemeProvider>
    </ShellContext.Provider>
  )
}
