import { UserSettings } from 'models/settings'
import { encryption } from 'services/Encryption'
import {
  serializationService,
  SerializedUserSettings,
} from 'services/Serialization'

export const mockSerializedPublicKey = 'public key'
export const mockSerializedPrivateKey = 'private key'

export const mockSerializationService = serializationService

mockSerializationService.serializeUserSettings = async (
  userSettings: UserSettings
) => {
  const { publicKey, privateKey, ...userSettingsRest } = userSettings

  return {
    publicKey: mockSerializedPublicKey,
    privateKey: mockSerializedPrivateKey,
    ...userSettingsRest,
  }
}

mockSerializationService.deserializeUserSettings = async (
  serializedUserSettings: SerializedUserSettings
) => {
  const { publicKey, privateKey, ...userSettingsRest } = serializedUserSettings

  return {
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    ...userSettingsRest,
  }
}
