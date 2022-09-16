import { PropsWithChildren, useContext } from 'react'
import { Link } from 'react-router-dom'
import { Theme } from '@mui/material/styles'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Home from '@mui/icons-material/Home'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'

import { SettingsContext } from 'contexts/SettingsContext'
import { PeerNameDisplay } from 'components/PeerNameDisplay'

import { DrawerHeader } from './DrawerHeader'

export const drawerWidth = 240

export interface DrawerProps extends PropsWithChildren {
  isDrawerOpen: boolean
  onDrawerClose: () => void
  onHomeLinkClick: () => void
  theme: Theme
  userPeerId: string
}

export const Drawer = ({
  isDrawerOpen,
  onDrawerClose,
  onHomeLinkClick,
  theme,
  userPeerId,
}: DrawerProps) => {
  const settingsContext = useContext(SettingsContext)
  const colorMode = settingsContext.getUserSettings().colorMode

  const handleColorModeToggleClick = () => {
    const newMode = colorMode === 'light' ? 'dark' : 'light'
    settingsContext.updateUserSettings({ colorMode: newMode })
  }

  return (
    <MuiDrawer
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
        <IconButton onClick={onDrawerClose} aria-label="Close menu">
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
            <Typography>
              Your user name:{' '}
              <PeerNameDisplay sx={{ fontWeight: 'bold' }}>
                {userPeerId}
              </PeerNameDisplay>
            </Typography>
          }
        />
      </ListItem>
      <Divider />
      <List role="navigation">
        <Link to="/" onClick={onHomeLinkClick}>
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
    </MuiDrawer>
  )
}
