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
import FileReaderInput, { Result } from 'react-file-reader-input'

import { ConfirmDialog } from 'components/ConfirmDialog'
import { EnhancedConnectivityControl } from 'components/EnhancedConnectivityControl'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
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

  const { setTitle, showAlert } = useContext(ShellContext)
  const { updateUserSettings, getUserSettings } = useContext(SettingsContext)
  const { getPersistedStorage } = useContext(StorageContext)
  const [isDeleteSettingsConfirmDialogOpen, setIsDeleteSettingsConfirmDialogOpen] = useState(false)
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
      setIsNotificationPermissionDetermined(true)
    })()
  }, [])

  useEffect(() => {
    setTitle('Настройки')
  }, [setTitle])

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
    if (isEnhancedConnectivityAvailable) {
      updateUserSettings({
        isEnhancedConnectivityEnabled: newIsEnhancedConnectivityEnabled,
      })
    }
  }

  const handleDeleteSettingsClick = () => {
    setIsDeleteSettingsConfirmDialogOpen(true)
  }

  const handleDeleteSettingsCancel = () => {
    setIsDeleteSettingsConfirmDialogOpen(false)
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
      showAlert('Профиль успешно импортирован', { severity: 'success' })
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
        Чат
      </Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography>Когда приходит сообщение в фоне:</Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={playSoundOnNewMessage}
                onChange={handlePlaySoundOnNewMessageChange}
              />
            }
            label="Проигрывать звук"
          />
          <FormControlLabel
            control={
              <Switch
                checked={areNotificationsAvailable && showNotificationOnNewMessage}
                onChange={handleShowNotificationOnNewMessageChange}
                disabled={!areNotificationsAvailable}
              />
            }
            label="Показывать уведомление"
          />
        </FormGroup>

        <Typography mt={2}>
          Выберите звук, который будет проигрываться при получении сообщения:
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
            label="Показывать индикатор набора текста"
          />
        </FormGroup>
        <Typography variant="subtitle2">
          При отключении вы также не будете показывать свой статус набора другим.
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
            Сеть
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
        Данные
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        }}
      >
        Экспортировать данные профиля
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Экспортируйте свой профиль Chitchatter, чтобы перенести его в другой браузер или на другое устройство.{' '}
        <strong>Будьте осторожны: не передавайте экспортированные данные никому</strong>. Они содержат ваши уникальные ключи верификации.
      </Typography>
      <Button
        variant="outlined"
        sx={{ mb: 2 }}
        onClick={handleExportSettingsClick}
      >
        Экспортировать данные профиля
      </Button>
      <Typography
        variant="h2"
        sx={{
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        }}
      >
        Импортировать данные профиля
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Импортируйте ранее экспортированный профиль Chitchatter из другого браузера или устройства.
      </Typography>
      <FileReaderInput
        as="text"
        onChange={(_e, results) => {
          handleImportSettingsClick(results)
        }}
      >
        <Button
          color="warning"
          variant="outlined"
          sx={{ mb: 2 }}
        >
          Импортировать данные профиля
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
        Удалить все данные профиля
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        <strong>Будьте осторожны</strong>. Это изменит ваше имя пользователя с{' '}
        <strong>
          <PeerNameDisplay
            sx={{ fontWeight: theme.typography.fontWeightMedium }}
          >
            {userId}
          </PeerNameDisplay>
        </strong>{' '}
        на новое, случайное. Также будут сброшены все настройки приложения Chitchatter.
      </Typography>
      <Button
        variant="outlined"
        color="error"
        sx={{ mb: 2 }}
        onClick={handleDeleteSettingsClick}
      >
        Удалить данные и начать заново
      </Button>

      <ConfirmDialog
        isOpen={isDeleteSettingsConfirmDialogOpen}
        onCancel={handleDeleteSettingsCancel}
        onConfirm={handleDeleteSettingsConfirm}
      />

      <Typography
        variant="subtitle2"
        sx={{ mb: 2 }}
      >
        Chitchatter хранит только ваши настройки и никогда — содержимое сообщений. Эти данные сохраняются только на вашем устройстве и не передаются на серверы.
      </Typography>

      <Divider sx={{ my: 2 }} />
    </Box>
  )
}