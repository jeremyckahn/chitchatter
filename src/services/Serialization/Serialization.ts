import { ColorMode, UserSettings } from 'models/settings'
import { AllowedKeyType, encryption } from 'services/Encryption'

export interface SerializedUserSettings
  extends Omit<UserSettings, 'publicKey' | 'privateKey'> {
  publicKey: string
  privateKey: string
}

export const isSerializedUserSettings = (
  data: any
): data is SerializedUserSettings => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'colorMode' in data &&
    Object.values(ColorMode).includes(data.colorMode) &&
    'userId' in data &&
    typeof data.userId === 'string' &&
    'customUsername' in data &&
    typeof data.customUsername === 'string' &&
    'playSoundOnNewMessage' in data &&
    typeof data.playSoundOnNewMessage === 'boolean' &&
    'showNotificationOnNewMessage' in data &&
    typeof data.showNotificationOnNewMessage === 'boolean' &&
    'showActiveTypingStatus' in data &&
    typeof data.showActiveTypingStatus === 'boolean' &&
    'publicKey' in data &&
    typeof data.publicKey === 'string' &&
    'privateKey' in data &&
    typeof data.privateKey === 'string'
  )
}

export class SerializationService {
  serializeUserSettings = async (
    userSettings: UserSettings
  ): Promise<SerializedUserSettings> => {
    const {
      publicKey: publicCryptoKey,
      privateKey: privateCryptoKey,
      ...userSettingsRest
    } = userSettings

    const publicKey = await encryption.stringifyCryptoKey(publicCryptoKey)

    const privateKey = await encryption.stringifyCryptoKey(privateCryptoKey)

    return {
      ...userSettingsRest,
      publicKey,
      privateKey,
    }
  }

  deserializeUserSettings = async (
    serializedUserSettings: SerializedUserSettings
  ): Promise<UserSettings> => {
    const {
      publicKey: publicCryptoKeyString,
      privateKey: privateCryptoKeyString,
      ...userSettingsForIndexedDbRest
    } = serializedUserSettings

    const publicKey = await encryption.parseCryptoKeyString(
      publicCryptoKeyString,
      AllowedKeyType.PUBLIC
    )
    const privateKey = await encryption.parseCryptoKeyString(
      privateCryptoKeyString,
      AllowedKeyType.PRIVATE
    )

    return {
      ...userSettingsForIndexedDbRest,
      publicKey,
      privateKey,
    }
  }
}

export const serialization = new SerializationService()
