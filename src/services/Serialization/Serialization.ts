import { UserSettings } from 'models/settings'
import { AllowedKeyType, EncryptionService } from 'services/Encryption'

export interface UserSettingsForIndexedDb
  extends Omit<UserSettings, 'publicKey' | 'privateKey'> {
  publicKey: string
  privateKey: string
}

export class SerializationService {
  static getUserSettingsForIndexedDb = async (
    userSettings: UserSettings
  ): Promise<UserSettingsForIndexedDb> => {
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
}
