import { SettingsContextProps } from 'contexts/SettingsContext'
import { ColorMode, UserSettings } from 'models/settings'
import { encryptionService } from 'services/Encryption'

export const userSettingsContextStubFactory = (
  userSettingsOverrides: Partial<UserSettings> = {}
) => {
  const userSettingsStub: SettingsContextProps = {
    updateUserSettings: () => Promise.resolve(),
    getUserSettings: () => ({
      userId: '',
      customUsername: '',
      colorMode: ColorMode.DARK,
      playSoundOnNewMessage: true,
      showNotificationOnNewMessage: true,
      showActiveTypingStatus: true,
      publicKey: encryptionService.cryptoKeyStub,
      privateKey: encryptionService.cryptoKeyStub,
      ...userSettingsOverrides,
    }),
  }

  return userSettingsStub
}
