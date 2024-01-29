import { UserSettings } from 'models/settings'
import { encryption } from 'services/Encryption'
import { serialization, SerializedUserSettings } from 'services/Serialization'

export const mockSerializedPublicKey = 'public key'
export const mockSerializedPrivateKey = 'private key'

export const mockSerialization = serialization

mockSerialization.serializeUserSettings = async (
  userSettings: UserSettings
) => {
  const { publicKey, privateKey, ...userSettingsRest } = userSettings

  return {
    publicKey: mockSerializedPublicKey,
    privateKey: mockSerializedPrivateKey,
    ...userSettingsRest,
  }
}

mockSerialization.deserializeUserSettings = async (
  serializedUserSettings: SerializedUserSettings
) => {
  const { publicKey, privateKey, ...userSettingsRest } = serializedUserSettings

  return {
    publicKey: encryption.cryptoKeyStub,
    privateKey: encryption.cryptoKeyStub,
    ...userSettingsRest,
  }
}
