import { ColorMode, UserSettings } from 'models/settings'
import { encryptionService } from 'services/Encryption'

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
    publicKey: encryptionService.cryptoKeyStub,
    privateKey: encryptionService.cryptoKeyStub,
    ...overrides,
  }
}
