import { styled } from '@mui/material/styles'
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import {
  Toolbar,
  Typography,
  StepIcon,
  Tooltip,
  IconButton,
} from '@mui/material'
import { Menu, Link, RoomPreferences, QrCode2 } from '@mui/icons-material'

import { drawerWidth } from './Drawer'
import { peerListWidth } from './PeerList'

interface AppBarProps extends MuiAppBarProps {
  isDrawerOpen?: boolean
  isPeerListOpen?: boolean
}

export const AppBar = styled(MuiAppBar, {
  shouldForwardProp: prop =>
    prop !== 'isDrawerOpen' && prop !== 'isPeerListOpen',
})<AppBarProps>(({ theme, isDrawerOpen, isPeerListOpen }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(isDrawerOpen && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
  }),
  ...(isPeerListOpen && {
    width: `calc(100% - ${peerListWidth}px)`,
    marginRight: `${peerListWidth}px`,
  }),
  ...((isDrawerOpen || isPeerListOpen) && {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  ...(isDrawerOpen &&
    isPeerListOpen && {
      width: `calc(100% - ${drawerWidth}px - ${peerListWidth}px)`,
    }),
}))

interface ShellAppBarProps {
  doShowPeers: boolean
  onDrawerOpen: () => void
  onLinkButtonClick: () => Promise<void>
  isDrawerOpen: boolean
  isPeerListOpen: boolean
  numberOfPeers: number
  title: string
  onPeerListClick: () => void
  onRoomControlsClick: () => void
  setIsQRCodeDialogOpen: (isOpen: boolean) => void
}

export const ShellAppBar = ({
  doShowPeers,
  onDrawerOpen,
  onLinkButtonClick,
  isDrawerOpen,
  isPeerListOpen,
  setIsQRCodeDialogOpen,
  numberOfPeers,
  title,
  onPeerListClick,
  onRoomControlsClick,
}: ShellAppBarProps) => {
  const handleQRCodeClick = () => setIsQRCodeDialogOpen(true)
  return (
    <AppBar
      position="fixed"
      isDrawerOpen={isDrawerOpen}
      isPeerListOpen={isPeerListOpen}
    >
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
          onClick={onDrawerOpen}
        >
          <Menu />
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
            color="inherit"
            aria-label="Copy current URL"
            onClick={onLinkButtonClick}
          >
            <Link />
          </IconButton>
        </Tooltip>
        {doShowPeers ? (
          <>
            <Tooltip title="Show QR Code">
              <IconButton
                size="large"
                color="inherit"
                aria-label="Show QR Code"
                onClick={handleQRCodeClick}
              >
                <QrCode2 />
              </IconButton>
            </Tooltip>
            <Tooltip title="Show Room Controls">
              <IconButton
                size="large"
                color="inherit"
                aria-label="Show Room Controls"
                onClick={onRoomControlsClick}
              >
                <RoomPreferences />
              </IconButton>
            </Tooltip>
            <Tooltip title="Click to show peer list">
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                aria-label="Peer list"
                onClick={onPeerListClick}
              >
                <StepIcon icon={numberOfPeers} />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
      </Toolbar>
    </AppBar>
  )
}
