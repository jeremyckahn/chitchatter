import { encryptionService } from 'services/Encryption'

export const mockEncryptionService = encryptionService

mockEncryptionService.generateKeyPair = jest.fn(async () => ({
  publicKey: encryptionService.cryptoKeyStub,
  privateKey: encryptionService.cryptoKeyStub,
}))

mockEncryptionService.encodePassword = async () => ''

mockEncryptionService.stringifyCryptoKey = async () => ''

mockEncryptionService.parseCryptoKeyString = async () =>
  encryptionService.cryptoKeyStub
