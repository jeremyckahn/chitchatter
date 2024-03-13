import { lazy, Suspense, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { v4 as uuid } from 'uuid'

import { encryption } from 'services/Encryption'
import {
  EnvironmentUnsupportedDialog,
  isEnvironmentSupported,
} from 'components/Shell/EnvironmentUnsupportedDialog'
import { WholePageLoading } from 'components/Loading/Loading'
import { ColorMode, UserSettings } from 'models/settings'

import type { BootstrapProps } from './Bootstrap'

const Bootstrap = lazy(() => import('./Bootstrap'))

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
        const { publicKey, privateKey } = await encryption.generateKeyPair()

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

  if (!isEnvironmentSupported) {
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
    return <WholePageLoading />
  }

  return (
    <Suspense fallback={<WholePageLoading />}>
      <Bootstrap {...props} initialUserSettings={userSettings} />
    </Suspense>
  )
}

export default Init
