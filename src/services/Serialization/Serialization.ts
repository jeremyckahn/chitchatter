import { UserSettings } from 'models/settings'
import { AllowedKeyType, EncryptionService } from 'services/Encryption'

export interface SerializedUserSettings
  extends Omit<UserSettings, 'publicKey' | 'privateKey'> {
  publicKey: string
  privateKey: string
}

export class SerializationService {
  static serializeUserSettings = async (
    userSettings: UserSettings
  ): Promise<SerializedUserSettings> => {
    const {
      publicKey: publicCryptoKey,
      privateKey: privateCryptoKey,
      ...userSettingsRest
    } = userSettings

    const publicKey = await EncryptionService.convertCryptoKeyToString(
      publicCryptoKey,
      AllowedKeyType.PUBLIC
    )

    const privateKey = await EncryptionService.convertCryptoKeyToString(
      privateCryptoKey,
      AllowedKeyType.PRIVATE
    )

    return {
      ...userSettingsRest,
      publicKey,
      privateKey,
    }
  }

  static deserializeUserSettings = async (
    serializedUserSettings: SerializedUserSettings
  ): Promise<UserSettings> => {
    const {
      publicKey: publicCryptoKey,
      privateKey: privateCryptoKey,
      ...userSettingsForIndexedDbRest
    } = serializedUserSettings

    const publicKey = await EncryptionService.convertStringToCryptoKey(
      publicCryptoKey,
      AllowedKeyType.PUBLIC
    )
    const privateKey = await EncryptionService.convertStringToCryptoKey(
      privateCryptoKey,
      AllowedKeyType.PRIVATE
    )

    return {
      ...userSettingsForIndexedDbRest,
      publicKey,
      privateKey,
    }
  }
}
