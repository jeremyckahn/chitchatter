import { PropsWithChildren, useContext } from 'react'
import { useTranslation } from 'react-i18next'
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
import LanguageIcon from '@mui/icons-material/Language'
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
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const settingsContext = useContext(SettingsContext)
  const colorMode = settingsContext.getUserSettings().colorMode

  const handleColorModeToggleClick = () => {
    const newMode =
      colorMode === ColorMode.LIGHT ? ColorMode.DARK : ColorMode.LIGHT
    settingsContext.updateUserSettings({ colorMode: newMode })
  }

  const handleLanguageToggle = () => {
    const currentLang = i18n.language
    const newLang = currentLang.startsWith('zh') ? 'en' : 'zh-CN'
    i18n.changeLanguage(newLang)
    localStorage.setItem('i18n_lang', newLang)
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
        <IconButton onClick={onDrawerClose} aria-label={t('shell.closeMenu')}>
          {theme.direction === 'ltr' ? (
            <ChevronLeftIcon />
          ) : (
            <ChevronRightIcon />
          )}
        </IconButton>
      </Box>
      <Divider />
      <Box component="nav" aria-label={t('shell.navMenu')}>
        <List>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.ROOT}>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary={t('shell.home')} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.SETTINGS}>
              <ListItemIcon>
                <SettingsApplications />
              </ListItemIcon>
              <ListItemText primary={t('shell.settings')} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.ABOUT}>
              <ListItemIcon>
                <QuestionMark />
              </ListItemIcon>
              <ListItemText primary={t('shell.about')} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={Link} to={routes.DISCLAIMER}>
              <ListItemIcon>
                <ReportIcon />
              </ListItemIcon>
              <ListItemText primary={t('shell.disclaimer')} />
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
              <ListItemText primary={t('shell.changeTheme')} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLanguageToggle}>
              <ListItemIcon>
                <LanguageIcon />
              </ListItemIcon>
              <ListItemText
                primary={i18n.language.startsWith('zh') ? 'English' : '中文'}
              />
            </ListItemButton>
          </ListItem>
        </List>
        <Divider />
        <Box sx={{ padding: 2 }}>
          <Typography variant="subtitle2">
            {t('shell.buildSignature')}{' '}
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
