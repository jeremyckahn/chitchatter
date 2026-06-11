import { vi } from 'vitest'
import { encryption } from 'services/Encryption'

export const mockEncryptionService = encryption

mockEncryptionService.generateKeyPair = vi.fn(async () => ({
  publicKey: encryption.cryptoKeyStub,
  privateKey: encryption.cryptoKeyStub,
}))

mockEncryptionService.encodePassword = async () => ''

mockEncryptionService.stringifyCryptoKey = async () => ''

mockEncryptionService.parseCryptoKeyString = async () =>
  encryption.cryptoKeyStub

mockEncryptionService.signString = async () => new ArrayBuffer(0)

mockEncryptionService.verifySignature = async () => true
