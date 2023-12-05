import { createContext } from 'react'

import { ColorMode, UserSettings } from 'models/settings'
import { cryptoKeyStub } from 'utils'

export interface SettingsContextProps {
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>
  getUserSettings: () => UserSettings
}

export const SettingsContext = createContext<SettingsContextProps>({
  updateUserSettings: () => Promise.resolve(),
  getUserSettings: () => ({
    userId: '',
    customUsername: '',
    colorMode: ColorMode.DARK,
    playSoundOnNewMessage: true,
    showNotificationOnNewMessage: true,
    showActiveTypingStatus: true,
    publicKey: cryptoKeyStub,
    privateKey: cryptoKeyStub,
  }),
})
