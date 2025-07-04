import { ColorMode, UserSettings } from 'models/settings'
import { encryption } from 'services/Encryption'

import { DEFAULT_SOUND } from 'config/soundNames'

export const userSettingsStubFactory = (
  overrides: Partial<UserSettings> = {}
): UserSettings => {
  return {
    userId: '1234-abcd',
    customUsername: '',
    colorMode: ColorMode.DARK,
    playSoundOnNewMessage: true,
    showNotificationOnNewMessage: true,
    showActiveTypingStatus: true,
    isEnhancedConnectivityEnabled: true,
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    selectedSound: DEFAULT_SOUND,
    ...overrides,
  }
}
