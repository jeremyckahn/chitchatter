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

    const publicKey = await EncryptionService.stringifyCryptoKey(
      publicCryptoKey
    )

    const privateKey = await EncryptionService.stringifyCryptoKey(
      privateCryptoKey
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
      publicKey: publicCryptoKeyString,
      privateKey: privateCryptoKeyString,
      ...userSettingsForIndexedDbRest
    } = serializedUserSettings

    const publicKey = await EncryptionService.parseCryptoKeyString(
      publicCryptoKeyString,
      AllowedKeyType.PUBLIC
    )
    const privateKey = await EncryptionService.parseCryptoKeyString(
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
