export enum ColorMode {
  DARK = 'dark',
  LIGHT = 'light',
}

const ColorModeValues = Object.values(ColorMode)

export const isColorMode = (color: string): color is ColorMode => {
  return ColorModeValues.map(String).includes(color)
}

export interface UserSettings {
  colorMode: ColorMode
  userId: string
  customUsername: string
  playSoundOnNewMessage: boolean
  showNotificationOnNewMessage: boolean
  showActiveTypingStatus: boolean
}
