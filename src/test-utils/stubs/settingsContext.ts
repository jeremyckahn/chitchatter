import { SettingsContextProps } from 'contexts/SettingsContext'
import { UserSettings } from 'models/settings'

export const userSettingsContextStubFactory = (
  userSettingsOverrides: Partial<UserSettings> = {}
) => {
  const userSettingsStub: SettingsContextProps = {
    updateUserSettings: () => Promise.resolve(),
    getUserSettings: () => ({
      userId: '',
      customUsername: '',
      colorMode: 'dark',
      playSoundOnNewMessage: true,
      showNotificationOnNewMessage: true,
      ...userSettingsOverrides,
    }),
  }

  return userSettingsStub
}
