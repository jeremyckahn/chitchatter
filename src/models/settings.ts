export enum ColorMode {
  DARK = 'dark',
  LIGHT = 'light',
}

const ColorModeValues = Object.values(ColorMode)

export const isColorMode = (color: string): color is ColorMode => {
  return ColorModeValues.map(String).includes(color)
}

enum UserSettingsKey {
  COLOR_MODE = 'colorMode',
  USER_ID = 'userId',
  CUSTOM_USERNAME = 'customUsername',
  PLAY_SOUND_ON_NEW_MESSAGE = 'playSoundOnNewMessage',
  SHOW_NOTIFICATION_ON_NEW_MESSAGE = 'showNotificationOnNewMessage',
  SHOW_ACTIVE_TYPING_STATUS = 'showActiveTypingStatus',
}

export interface UserSettings {
  [UserSettingsKey.COLOR_MODE]: ColorMode
  [UserSettingsKey.USER_ID]: string
  [UserSettingsKey.CUSTOM_USERNAME]: string
  [UserSettingsKey.PLAY_SOUND_ON_NEW_MESSAGE]: boolean
  [UserSettingsKey.SHOW_NOTIFICATION_ON_NEW_MESSAGE]: boolean
  [UserSettingsKey.SHOW_ACTIVE_TYPING_STATUS]: boolean
}

const userSettingsKeyStrings = Object.values(UserSettingsKey).map(String)

export const isUserSettingKey = (key: string): key is keyof UserSettings => {
  return userSettingsKeyStrings.includes(key)
}

export const pickUserSettings = (
  record: Record<string, any>
): Partial<UserSettings> => {
  const userSettings: Partial<UserSettings> = {}

  for (const [key, value] of Object.entries(record)) {
    if (!isUserSettingKey(key)) continue

    // TODO: Future improvement: Validate the type of the value (right now it
    // is any).
    userSettings[key] = value
  }

  return userSettings
}

enum NetworkSettingsKey {
  TRACKER_URLS = 'trackerUrls',
  RTC_CONFIG = 'rtcConfig',
}

export interface NetworkSettings {
  [NetworkSettingsKey.TRACKER_URLS]: string[] | undefined
  [NetworkSettingsKey.RTC_CONFIG]: RTCConfiguration
}

const networkSettingsKeyStrings = Object.values(NetworkSettingsKey).map(String)

export const isNetworkSettingKey = (
  key: string
): key is keyof NetworkSettings => {
  return networkSettingsKeyStrings.includes(key)
}

export const pickNetworkSettings = (
  record: Record<string, any>
): Partial<NetworkSettings> => {
  const networkSettings: Partial<NetworkSettings> = {}

  for (const [key, value] of Object.entries(record)) {
    if (!isNetworkSettingKey(key)) continue

    // TODO: Future improvement: Validate the type of the value (right now it
    // is any).
    networkSettings[key] = value
  }

  return networkSettings
}
