import { createContext } from 'react'

import { ColorMode, NetworkSettings, UserSettings } from 'models/settings'
import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'

export interface SettingsContextProps {
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>
  getUserSettings: () => UserSettings
  updateNetworkSettings: (settings: Partial<NetworkSettings>) => void
  getNetworkSettings: () => NetworkSettings
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
  }),
  updateNetworkSettings: () => Promise.resolve(),
  getNetworkSettings: () => ({
    rtcConfig,
    trackerUrls,
  }),
})
