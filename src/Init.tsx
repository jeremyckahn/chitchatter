import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { v4 as uuid } from 'uuid'

import { encryptionService } from 'services/Encryption'
import { EnvironmentUnsupportedDialog } from 'components/Shell/EnvironmentUnsupportedDialog'
import { WholePageLoading } from 'components/Loading/Loading'
import { ColorMode, UserSettings } from 'models/settings'

import { Bootstrap, BootstrapProps } from './Bootstrap'

export interface InitProps extends Omit<BootstrapProps, 'initialUserSettings'> {
  getUuid?: typeof uuid
}

// NOTE: This is meant to be a thin layer around the Bootstrap component that
// only handles asynchronous creation of the public/private keys that Bootstrap
// requires.
const Init = ({ getUuid = uuid, ...props }: InitProps) => {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (userSettings !== null) return

      try {
        const { publicKey, privateKey } =
          await encryptionService.generateKeyPair()

        setUserSettings({
          userId: getUuid(),
          customUsername: '',
          colorMode: ColorMode.DARK,
          playSoundOnNewMessage: true,
          showNotificationOnNewMessage: true,
          showActiveTypingStatus: true,
          publicKey,
          privateKey,
        })
      } catch (e) {
        console.error(e)
        setErrorMessage(
          'Chitchatter was unable to boot up. Please check the browser console.'
        )
      }
    })()
  }, [getUuid, userSettings])

  if (!window.isSecureContext) {
    return <EnvironmentUnsupportedDialog />
  }

  if (errorMessage) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography>{errorMessage}</Typography>
      </Box>
    )
  }

  if (userSettings === null) {
    return <WholePageLoading sx={{ height: '100vh' }} />
  }

  return <Bootstrap {...props} initialUserSettings={userSettings} />
}

export default Init
