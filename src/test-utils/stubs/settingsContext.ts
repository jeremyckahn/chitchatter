import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'
import { SettingsContextProps } from 'contexts/SettingsContext'
import { ColorMode, UserSettings } from 'models/settings'

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
      ...userSettingsOverrides,
    }),
    updateNetworkSettings: () => Promise.resolve(),
    getNetworkSettings: () => ({
      rtcConfig,
      trackerUrls,
    }),
  }

  return userSettingsStub
}
