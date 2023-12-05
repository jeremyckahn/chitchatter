import { ColorMode, UserSettings } from 'models/settings'
import { cryptoKeyStub } from 'utils'

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
    publicKey: cryptoKeyStub,
    privateKey: cryptoKeyStub,
    ...overrides,
  }
}
