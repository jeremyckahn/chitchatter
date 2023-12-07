import { encryptionService } from 'services/Encryption'

export const mockEncryptionService = encryptionService

mockEncryptionService.generateKeyPair = jest.fn(async () => ({
  publicKey: encryptionService.cryptoKeyStub,
  privateKey: encryptionService.cryptoKeyStub,
}))

mockEncryptionService.encodePassword = jest.fn(async () => '')

mockEncryptionService.stringifyCryptoKey = jest.fn(async () => '')

mockEncryptionService.parseCryptoKeyString = jest.fn(
  async () => encryptionService.cryptoKeyStub
)
