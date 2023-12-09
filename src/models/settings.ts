export enum ColorMode {
  DARK = 'dark',
  LIGHT = 'light',
}

const ColorModeValueStrings = Object.values(ColorMode).map(String)

export const isColorMode = (color: string): color is ColorMode => {
  return ColorModeValueStrings.includes(color)
}

export interface UserSettings {
  colorMode: ColorMode
  userId: string
  customUsername: string
  playSoundOnNewMessage: boolean
  showNotificationOnNewMessage: boolean
  showActiveTypingStatus: boolean
  publicKey: CryptoKeyPair['publicKey']
  privateKey: CryptoKeyPair['privateKey']
}
