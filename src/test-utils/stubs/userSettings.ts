import { ColorMode, UserSettings } from 'models/settings'
import { encryption } from 'services/Encryption'

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
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    ...overrides,
  }
}
