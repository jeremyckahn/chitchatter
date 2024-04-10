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

import { settings } from 'services/Settings'
import { notification } from 'services/Notification'
import { ShellContext } from 'contexts/ShellContext'
import { StorageContext } from 'contexts/StorageContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { ConfirmDialog } from 'components/ConfirmDialog'

import { isErrorWithMessage } from '../../lib/type-guards'

interface SettingsProps {
  userId: string
}

export const Settings = ({ userId }: SettingsProps) => {
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
    setTitle('Settings')
  }, [setTitle])

  const handlePlaySoundOnNewMessageChange = (
    _event: ChangeEvent,
    playSoundOnNewMessage: boolean
  ) => {
    updateUserSettings({ playSoundOnNewMessage })
  }

  const handleShowNotificationOnNewMessageChange = (
    _event: ChangeEvent,
    showNotificationOnNewMessage: boolean
  ) => {
    updateUserSettings({ showNotificationOnNewMessage })
  }

  const handleShowActiveTypingStatusChange = (
    _event: ChangeEvent,
    showActiveTypingStatus: boolean
  ) => {
    updateUserSettings({ showActiveTypingStatus })
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
        Chat
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography>When a message is received in the background:</Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={playSoundOnNewMessage}
                onChange={handlePlaySoundOnNewMessageChange}
              />
            }
            label="Play a sound"
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
            label="Show a notification"
          />
        </FormGroup>
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
            label="Show active typing indicators"
          />
        </FormGroup>
        <Typography variant="subtitle2">
          Disabling this will also hide your active typing status from others.
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
