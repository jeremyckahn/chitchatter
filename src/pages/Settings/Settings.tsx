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

import { settingsService } from 'services/Settings'
import { NotificationService } from 'services/Notification'
import { ShellContext } from 'contexts/ShellContext'
import { StorageContext } from 'contexts/StorageContext'
import { PeerNameDisplay } from 'components/PeerNameDisplay'

import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SettingsContext } from '../../contexts/SettingsContext'

interface SettingsProps {
  userId: string
}

export const Settings = ({ userId }: SettingsProps) => {
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
      await NotificationService.requestPermission()

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

  const handleExportSettingsClick = () => {
    settingsService.exportSettings(getUserSettings())
  }

  const handleImportSettingsClick = async ([[, file]]: Result[]) => {
    try {
      const userSettings = await settingsService.importSettings(file)

      updateUserSettings(userSettings)

      showAlert('Profile successfully imported', { severity: 'success' })
    } catch (e) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof e.message === 'string'
      ) {
        showAlert(e.message, { severity: 'error' })
      }
    }
  }

  const areNotificationsAvailable = NotificationService.permission === 'granted'

  return (
    <Box className="max-w-3xl mx-auto p-4">
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 2,
        })}
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
        <Typography variant="subtitle2" sx={_theme => ({})}>
          Disabling this will also hide your active typing status from others.
        </Typography>
      </Paper>
      <Divider sx={{ my: 2 }} />
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 2,
        })}
      >
        Data
      </Typography>
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        })}
      >
        Export profile data
      </Typography>
      <Typography
        variant="body1"
        sx={_theme => ({
          mb: 2,
        })}
      >
        You can export your profile data so that it can be moved to another
        browser or device.{' '}
        <strong>Be careful not to share the exported data with anyone</strong>,
        as it contains your unique verification keys.
      </Typography>
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        })}
      >
        Import profile data
      </Typography>
      <Button
        variant="outlined"
        sx={_theme => ({
          mb: 2,
        })}
        onClick={handleExportSettingsClick}
      >
        Export profile data
      </Button>
      <Typography
        variant="body1"
        sx={_theme => ({
          mb: 2,
        })}
      >
        Import data that was previously exported from another browser or device.
      </Typography>
      <FileReaderInput
        {...{
          as: 'text',
          onChange: (e, results) => {
            handleImportSettingsClick(results)
          },
        }}
      >
        <Button
          color="warning"
          variant="outlined"
          sx={_theme => ({
            mb: 2,
          })}
        >
          Import profile data
        </Button>
      </FileReaderInput>
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        })}
      >
        Delete all profile data
      </Typography>
      <Typography
        variant="body1"
        sx={_theme => ({
          mb: 2,
        })}
      >
        <strong>Be careful with this</strong>. This will cause your user name to
        change from{' '}
        <strong>
          <PeerNameDisplay
            sx={theme => ({
              fontWeight: theme.typography.fontWeightMedium,
            })}
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
        sx={_theme => ({
          mb: 2,
        })}
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
        sx={_theme => ({
          mb: 2,
        })}
      >
        Chitchatter only stores user preferences and never message content of
        any kind. This preference data is only stored locally on your device and
        not a server.
      </Typography>
      <Divider sx={{ my: 2 }} />
    </Box>
  )
}
