import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Paper from '@mui/material/Paper'
import useTheme from '@mui/material/styles/useTheme'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { ChangeEvent, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FileReaderInput, { Result } from 'react-file-reader-input'

import { ConfirmDialog } from 'components/ConfirmDialog'
import { EnhancedConnectivityControl } from 'components/EnhancedConnectivityControl'
import { SoundSelector } from 'components/SoundSelector/SoundSelector'
import { isEnhancedConnectivityAvailable } from 'config/enhancedConnectivity'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { StorageContext } from 'contexts/StorageContext'
import { notification } from 'services/Notification'
import { settings } from 'services/Settings'

import { isErrorWithMessage } from '../../lib/type-guards'

interface SettingsProps {
  userId: string
}

export const Settings = ({ userId }: SettingsProps) => {
  const theme = useTheme()
  const { t } = useTranslation()

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
    isEnhancedConnectivityEnabled,
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

  const handleIsEnhancedConnectivityEnabledChange = (
    _event: ChangeEvent,
    newIsEnhancedConnectivityEnabled: boolean
  ) => {
    // Only update if enhanced connectivity is available
    if (isEnhancedConnectivityAvailable) {
      updateUserSettings({
        isEnhancedConnectivityEnabled: newIsEnhancedConnectivityEnabled,
      })
    }
  }

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

      showAlert(t('settings.importSuccess'), { severity: 'success' })
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
        {t('settings.chat')}
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography>{t('settings.backgroundMessage')}</Typography>
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
        <Typography mt={2}>{t('settings.selectSound')}</Typography>
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
            label={t('settings.showTyping')}
          />
        </FormGroup>
        <Typography variant="subtitle2">
          {t('settings.hideTypingNote')}
        </Typography>
      </Paper>
      <Divider sx={{ my: 2 }} />
      {isEnhancedConnectivityAvailable && (
        <>
          <Typography
            variant="h2"
            sx={{
              fontSize: theme.typography.h3.fontSize,
              fontWeight: theme.typography.fontWeightMedium,
              mb: 2,
            }}
          >
            {t('settings.networking')}
          </Typography>
          <EnhancedConnectivityControl
            isEnabled={isEnhancedConnectivityEnabled}
            onChange={handleIsEnhancedConnectivityEnabledChange}
            variant="subtitle2"
          />
          <Divider sx={{ my: 2 }} />
        </>
      )}
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 2,
        }}
      >
        {t('settings.data')}
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        }}
      >
        {t('settings.exportProfile')}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          mb: 2,
        }}
      >
        {t('settings.exportProfileDesc')}
      </Typography>
      <Button
        variant="outlined"
        sx={{
          mb: 2,
        }}
        onClick={handleExportSettingsClick}
      >
        {t('settings.exportButton')}
      </Button>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        }}
      >
        {t('settings.importProfile')}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          mb: 2,
        }}
      >
        {t('settings.importProfileDesc')}
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
          {t('settings.importButton')}
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
        {t('settings.deleteProfile')}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          mb: 2,
        }}
      >
        {t('settings.deleteProfileDesc', { userId })}
      </Typography>
      <Button
        variant="outlined"
        color="error"
        sx={{
          mb: 2,
        }}
        onClick={handleDeleteSettingsClick}
      >
        {t('settings.deleteButton')}
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
        {t('settings.storageNote')}
      </Typography>
      <Divider sx={{ my: 2 }} />
    </Box>
  )
}
