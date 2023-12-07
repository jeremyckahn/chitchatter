import { EncryptionService } from 'services/Encryption'

// FIXME: Mock the rest of the service
export const mockEncryptionService = {
  ...EncryptionService,

  stringifyCryptoKey: async () => {
    return ''
  },
} as unknown as typeof EncryptionService
