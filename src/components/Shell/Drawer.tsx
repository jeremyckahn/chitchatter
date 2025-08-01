import { PropsWithChildren, useContext } from 'react'
import { Link } from 'react-router-dom'
import useTheme from '@mui/material/styles/useTheme'
import Box from '@mui/material/Box'
import MuiDrawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import MuiLink from '@mui/material/Link'
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
import SettingsApplications from '@mui/icons-material/SettingsRounded'
import QuestionMark from '@mui/icons-material/QuestionMark'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import ReportIcon from '@mui/icons-material/Report'
import GitInfo from 'react-git-info/macro'

import { routes } from 'config/routes'
import { SettingsContext } from 'contexts/SettingsContext'
import { ColorMode } from 'models/settings'

const { commit } = GitInfo()

export const drawerWidth = 240

export interface DrawerProps extends PropsWithChildren {
  isDrawerOpen: boolean
  onDrawerClose: () => void
}

export const Drawer = ({ isDrawerOpen, onDrawerClose }: DrawerProps) => {
  const theme = useTheme()
  const settingsContext = useContext(SettingsContext)
  const colorMode = settingsContext.getUserSettings().colorMode

  const handleColorModeToggleClick = () => {
    const newMode =
      colorMode === ColorMode.LIGHT ? ColorMode.DARK : ColorMode.LIGHT
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
      <Box
        sx={() => ({
          display: 'flex',
          alignItems: 'center',
          padding: theme.spacing(0, 1),
          // necessary for drawer content to be pushed below app bar
          ...theme.mixins.toolbar,
          justifyContent: 'flex-end',
        })}
      >
        <IconButton onClick={onDrawerClose} aria-label="Close menu">
          {theme.direction === 'ltr' ? (
            <ChevronLeftIcon />
          ) : (
            <ChevronRightIcon />
          )}
        </IconButton>
      </Box>
      <Divider />
      <Box component="nav" aria-label="Navigation menu">
        <List>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.ROOT}>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.SETTINGS}>
              <ListItemIcon>
                <SettingsApplications />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.ABOUT}>
              <ListItemIcon>
                <QuestionMark />
              </ListItemIcon>
              <ListItemText primary="About" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.DISCLAIMER}>
              <ListItemIcon>
                <ReportIcon />
              </ListItemIcon>
              <ListItemText primary="Disclaimer" />
            </ListItemButton>
          </ListItem>
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
        <Box sx={{ padding: 2 }}>
          <Typography variant="subtitle2">
            Build signature:{' '}
            <Typography
              sx={{
                fontFamily: 'monospace',
                display: 'inline',
              }}
            >
              <MuiLink
                target="_blank"
                rel="noopener"
                href={`${import.meta.env.VITE_GITHUB_REPO}/commit/${
                  commit.hash
                }`}
              >
                {commit.shortHash}
              </MuiLink>
            </Typography>
          </Typography>
        </Box>
      </Box>
    </MuiDrawer>
  )
}
