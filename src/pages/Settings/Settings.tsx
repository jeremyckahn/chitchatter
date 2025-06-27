import { ChangeEvent, useContext, useEffect, useState } from 'react'
import FileReaderInput, { Result } from 'react-file-reader-input'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Switch from '@mui/material/Switch'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import useTheme from '@mui/material/styles/useTheme'
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { useTranslation } from 'react-i18next';

import { settings } from 'services/Settings'
import { notification } from 'services/Notification'
import { ShellContext } from 'contexts/ShellContext'
import { StorageContext } from 'contexts/StorageContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { ConfirmDialog } from 'components/ConfirmDialog'
import { SoundSelector } from 'components/SoundSelector/SoundSelector'

import { isErrorWithMessage } from '../../lib/type-guards'

interface SettingsProps {
  userId: string
}

export const Settings = ({ userId }: SettingsProps) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme()

  const { setTitle, showAlert } = useContext(ShellContext)
  const { updateUserSettings, getUserSettings } = useContext(SettingsContext)
  const { getPersistedStorage } = useContext(StorageContext)
  const [
    isDeleteSettingsConfirmDiaglogOpen,
    setIsDeleteSettingsConfirmDiaglogOpen,
  ] = useState(false)
  const [, setIsNotificationPermissionDetermined] = useState(false)
  const {
    playSoundOnNewMessage,
    showNotificationOnNewMessage,
    showActiveTypingStatus,
  } = getUserSettings()

  const persistedStorage = getPersistedStorage()

  useEffect(() => {
    ;(async () => {
      await notification.requestPermission()

      // This state needs to be set to cause a rerender so that
      // areNotificationsAvailable is up-to-date.
      setIsNotificationPermissionDetermined(true)
    })()
  }, [])

  useEffect(() => {
    setTitle(t('settings.title'))
  }, [setTitle, t])

  const handlePlaySoundOnNewMessageChange = (
    _event: ChangeEvent,
    newPlaySoundOnNewMessage: boolean
  ) => {
    updateUserSettings({ playSoundOnNewMessage: newPlaySoundOnNewMessage })
  }

  const handleShowNotificationOnNewMessageChange = (
    _event: ChangeEvent,
    newShowNotificationOnNewMessage: boolean
  ) => {
    updateUserSettings({
      showNotificationOnNewMessage: newShowNotificationOnNewMessage,
    })
  }

  const handleShowActiveTypingStatusChange = (
    _event: ChangeEvent,
    newShowActiveTypingStatus: boolean
  ) => {
    updateUserSettings({ showActiveTypingStatus: newShowActiveTypingStatus })
  }

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    i18n.changeLanguage(event.target.value);
  };

  const handleDeleteSettingsClick = () => {
    setIsDeleteSettingsConfirmDiaglogOpen(true)
  }

  const handleDeleteSettingsCancel = () => {
    setIsDeleteSettingsConfirmDiaglogOpen(false)
  }

  const handleDeleteSettingsConfirm = async () => {
    await persistedStorage.clear()
    window.location.reload()
  }

  const handleExportSettingsClick = async () => {
    try {
      await settings.exportSettings(getUserSettings())
    } catch (e) {
      if (isErrorWithMessage(e)) {
        showAlert(e.message, { severity: 'error' })
      }
    }
  }

  const handleImportSettingsClick = async ([[, file]]: Result[]) => {
    try {
      const userSettings = await settings.importSettings(file)

      updateUserSettings(userSettings)

      showAlert('Profile successfully imported', { severity: 'success' })
    } catch (e) {
      if (isErrorWithMessage(e)) {
        showAlert(e.message, { severity: 'error' })
      }
    }
  }

  const areNotificationsAvailable = notification.permission === 'granted'

  return (
    <Box sx={{ p: 2, mx: 'auto', maxWidth: theme.breakpoints.values.md }}>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 2,
        }}
      >
        {t('settings.languageTitle')}
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="language-select-label">{t('settings.languageLabel')}</InputLabel>
          <Select
            labelId="language-select-label"
            value={i18n.language}
            label={t('settings.languageLabel')}
            onChange={handleLanguageChange}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="zh">中文</MenuItem>
          </Select>
        </FormControl>
      </Paper>
      <Divider sx={{ my: 2 }} />
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 2,
        }}
      >
        {t('settings.chatTitle')}
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography>{t('settings.whenMessageReceived')}</Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={playSoundOnNewMessage}
                onChange={handlePlaySoundOnNewMessageChange}
              />
            }
            label={t('settings.playSound')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={
                  areNotificationsAvailable && showNotificationOnNewMessage
                }
                onChange={handleShowNotificationOnNewMessageChange}
                disabled={!areNotificationsAvailable}
              />
            }
            label={t('settings.showNotification')}
          />
        </FormGroup>
        <Typography mt={2}>
          {t('settings.selectSound')}
        </Typography>
        <SoundSelector disabled={!playSoundOnNewMessage} />
      </Paper>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={showActiveTypingStatus}
                onChange={handleShowActiveTypingStatusChange}
              />
            }
            label={t('settings.showTypingIndicators')}
          />
        </FormGroup>
        <Typography variant="subtitle2">
          {t('settings.typingIndicatorsSubtitle')}
        </Typography>
      </Paper>
      <Divider sx={{ my: 2 }} />
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 2,
        }}
      >
        Data
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        }}
      >
        Export profile data
      </Typography>
      <Typography
        variant="body1"
        sx={{
          mb: 2,
        }}
      >
        Export your Chitchatter profile data so that it can be moved to another
        browser or device.{' '}
        <strong>Be careful not to share the exported data with anyone</strong>.
        It contains your unique verification keys.
      </Typography>
      <Button
        variant="outlined"
        sx={{
          mb: 2,
        }}
        onClick={handleExportSettingsClick}
      >
        Export profile data
      </Button>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        }}
      >
        Import profile data
      </Typography>
      <Typography
        variant="body1"
        sx={{
          mb: 2,
        }}
      >
        Import your Chitchatter profile that was previously exported from
        another browser or device.
      </Typography>
      <FileReaderInput
        {...{
          as: 'text',
          onChange: (_e, results) => {
            handleImportSettingsClick(results)
          },
        }}
      >
        <Button
          color="warning"
          variant="outlined"
          sx={{
            mb: 2,
          }}
        >
          Import profile data
        </Button>
      </FileReaderInput>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        }}
      >
        Delete all profile data
      </Typography>
      <Typography
        variant="body1"
        sx={{
          mb: 2,
        }}
      >
        <strong>Be careful with this</strong>. This will cause your user name to
        change from{' '}
        <strong>
          <PeerNameDisplay
            sx={{
              fontWeight: theme.typography.fontWeightMedium,
            }}
          >
            {userId}
          </PeerNameDisplay>
        </strong>{' '}
        to a new, randomly-assigned name. It will also reset all of your saved
        Chitchatter application preferences.
      </Typography>
      <Button
        variant="outlined"
        color="error"
        sx={{
          mb: 2,
        }}
        onClick={handleDeleteSettingsClick}
      >
        Delete all data and restart
      </Button>
      <ConfirmDialog
        isOpen={isDeleteSettingsConfirmDiaglogOpen}
        onCancel={handleDeleteSettingsCancel}
        onConfirm={handleDeleteSettingsConfirm}
      />
      <Typography
        variant="subtitle2"
        sx={{
          mb: 2,
        }}
      >
        Chitchatter only stores user preferences and never message content of
        any kind. This preference data is only stored locally on your device and
        not a server.
      </Typography>
      <Divider sx={{ my: 2 }} />
    </Box>
  )
}
