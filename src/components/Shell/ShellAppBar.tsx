import { styled } from '@mui/material/styles'
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import StepIcon from '@mui/material/StepIcon'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import LinkIcon from '@mui/icons-material/Link'

import { drawerWidth } from './Drawer'

interface AppBarProps extends MuiAppBarProps {
  open?: boolean
}

export const AppBar = styled(MuiAppBar, {
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

interface ShellAppBarProps {
  doShowPeers: boolean
  handleDrawerOpen: () => void
  handleLinkButtonClick: () => Promise<void>
  isDrawerOpen: boolean
  numberOfPeers: number
  title: string
}

export const ShellAppBar = ({
  doShowPeers,
  handleDrawerOpen,
  handleLinkButtonClick,
  isDrawerOpen,
  numberOfPeers,
  title,
}: ShellAppBarProps) => {
  return (
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
  )
}
