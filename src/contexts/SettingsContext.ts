import { createContext } from 'react'

import { ColorMode, UserSettings } from 'models/settings'
import { encryption } from 'services/Encryption'

import { DEFAULT_SOUND } from 'config/soundNames'

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
    isEnhancedConnectivityEnabled: true,
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    selectedSound: DEFAULT_SOUND,
    chatType: 'TEXT', // <-- Added this missing field
  }),
})
