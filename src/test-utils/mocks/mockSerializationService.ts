import { UserSettings } from 'models/settings'
import { EncryptionService } from 'services/Encryption'
import {
  SerializationService,
  SerializedUserSettings,
} from 'services/Serialization'

export const mockSerializedPublicKey = 'public key'
export const mockSerializedPrivateKey = 'private key'

// FIXME: Use jest functions to mock the methods
export const mockSerializationService = {
  serializeUserSettings: async (
    userSettings: UserSettings
  ): Promise<SerializedUserSettings> => {
    const { publicKey, privateKey, ...userSettingsRest } = userSettings

    return {
      publicKey: mockSerializedPublicKey,
      privateKey: mockSerializedPrivateKey,
      ...userSettingsRest,
    }
  },

  deserializeUserSettings: async (
    serializedUserSettings: SerializedUserSettings
  ): Promise<UserSettings> => {
    const { publicKey, privateKey, ...userSettingsRest } =
      serializedUserSettings

    return {
      publicKey: EncryptionService.cryptoKeyStub,
      privateKey: EncryptionService.cryptoKeyStub,
      ...userSettingsRest,
    }
  },
} as typeof SerializationService
