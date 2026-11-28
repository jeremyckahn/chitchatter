import { lazy, Suspense, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { deriveUserIdFromKey } from 'core/chat/identity'
import { encryption } from 'core/crypto/Encryption'
import {
  EnvironmentUnsupportedDialog,
  isEnvironmentSupported,
} from 'components/Shell/EnvironmentUnsupportedDialog'
import { WholePageLoading } from 'components/Loading/Loading'
import { ColorMode, UserSettings } from 'core/models/settings'

import { DEFAULT_SOUND } from 'config/soundNames'

import type { BootstrapProps } from './Bootstrap'

const Bootstrap = lazy(() => import('./Bootstrap'))

export type InitProps = Omit<BootstrapProps, 'initialUserSettings'>

// NOTE: This is meant to be a thin layer around the Bootstrap component that
// only handles asynchronous creation of the public/private keys that Bootstrap
// requires.
const Init = (props: InitProps) => {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (userSettings !== null) return

      try {
        const { publicKey, privateKey } = await encryption.generateKeyPair()

        setUserSettings({
          // Derived, not random, so that peers can check it against the key.
          userId: await deriveUserIdFromKey(encryption, publicKey),
          customUsername: '',
          colorMode: ColorMode.DARK,
          playSoundOnNewMessage: true,
          showNotificationOnNewMessage: true,
          showActiveTypingStatus: true,
          showVideoByDefault: false,
          isEnhancedConnectivityEnabled: true,
          publicKey,
          privateKey,
          selectedSound: DEFAULT_SOUND,
        })
      } catch (e) {
        console.error(e)
        setErrorMessage(
          'Chitchatter was unable to boot up. Please check the browser console.'
        )
      }
    })()
  }, [userSettings])

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
