import { webcrypto } from 'node:crypto'

import { describe, it, expect } from 'vitest'

import {
  AllowedKeyType,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  EncryptionService,
} from './Encryption'

// Polyfill window.crypto if not present in the JSDOM environment
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    Object.defineProperty(window, 'crypto', {
      value: webcrypto,
      writable: true,
    })
  }
  // Align JSDOM window.ArrayBuffer with Node's global ArrayBuffer to prevent cross-realm instanceof issues
  window.ArrayBuffer = globalThis.ArrayBuffer
}

describe('Encryption Service Helpers', () => {
  it('should convert an ArrayBuffer to base64 and back', () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    const base64 = arrayBufferToBase64(data.buffer)
    expect(base64).toBe('SGVsbG8=')

    const decodedBuffer = base64ToArrayBuffer(base64)
    expect(new Uint8Array(decodedBuffer)).toEqual(data)
  })
})

describe('EncryptionService', () => {
  const service = new EncryptionService()

  it('should generate a valid RSASSA-PKCS1-v1_5 key pair', async () => {
    const keyPair = await service.generateKeyPair()
    expect(keyPair.publicKey).toBeDefined()
    expect(keyPair.privateKey).toBeDefined()
    expect(keyPair.publicKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
    expect(keyPair.privateKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
    expect(keyPair.publicKey.usages).toContain('verify')
    expect(keyPair.privateKey.usages).toContain('sign')
  })

  it('should handle signString and verifySignature with stub key', async () => {
    const signature = await service.signString(
      service.cryptoKeyStub,
      'hello world'
    )
    expect(signature.byteLength).toBe(0)

    const isVerified = await service.verifySignature(
      service.cryptoKeyStub,
      signature,
      'hello world'
    )
    expect(isVerified).toBe(true)
  })

  it('should handle verifySignature with invalid signature inputs', async () => {
    const keyPair = await service.generateKeyPair()
    // Null/undefined signature
    let isVerified = await service.verifySignature(
      keyPair.publicKey,
      null as any,
      'test'
    )
    expect(isVerified).toBe(false)

    // Non-ArrayBuffer signature
    isVerified = await service.verifySignature(
      keyPair.publicKey,
      {} as any,
      'test'
    )
    expect(isVerified).toBe(false)
  })

  it('should sign and verify strings using generated keys', async () => {
    const keyPair = await service.generateKeyPair()
    const plaintext = 'This is a secret message.'

    const signature = await service.signString(keyPair.privateKey, plaintext)
    expect(signature.byteLength).toBeGreaterThan(0)

    const isVerified = await service.verifySignature(
      keyPair.publicKey,
      signature,
      plaintext
    )
    expect(isVerified).toBe(true)

    // Modified plaintext should fail verification
    const isVerifiedDiffText = await service.verifySignature(
      keyPair.publicKey,
      signature,
      'Different message.'
    )
    expect(isVerifiedDiffText).toBe(false)

    // Modified signature should fail verification
    const modifiedSignature = new Uint8Array(signature)
    modifiedSignature[0] ^= 1 // Corrupt first byte
    const isVerifiedCorrupted = await service.verifySignature(
      keyPair.publicKey,
      modifiedSignature.buffer,
      plaintext
    )
    expect(isVerifiedCorrupted).toBe(false)
  })

  it('should parse newly generated signature keys', async () => {
    const keyPair = await service.generateKeyPair()

    const pubKeyString = await service.stringifyCryptoKey(keyPair.publicKey)
    const privKeyString = await service.stringifyCryptoKey(keyPair.privateKey)

    const parsedPubKey = await service.parseCryptoKeyString(
      pubKeyString,
      AllowedKeyType.PUBLIC
    )
    const parsedPrivKey = await service.parseCryptoKeyString(
      privKeyString,
      AllowedKeyType.PRIVATE
    )

    expect(parsedPubKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
    expect(parsedPubKey.usages).toContain('verify')

    expect(parsedPrivKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
    expect(parsedPrivKey.usages).toContain('sign')
  })

  it('should fall back to parsing legacy encryption keys when signature parsing fails', async () => {
    // Generate a legacy RSA-OAEP key pair
    const legacyKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      },
      true,
      ['encrypt', 'decrypt']
    )

    const legacyPubKeyString = await service.stringifyCryptoKey(
      legacyKeyPair.publicKey
    )
    const legacyPrivKeyString = await service.stringifyCryptoKey(
      legacyKeyPair.privateKey
    )

    // Spy on importKey to force signature import to fail
    const originalImportKey = window.crypto.subtle.importKey.bind(
      window.crypto.subtle
    )
    const importKeySpy = vi
      .spyOn(window.crypto.subtle, 'importKey')
      .mockImplementation(
        async (format, keyData, algorithm, extractable, keyUsages) => {
          // Force import to fail if the algorithm name matches RSASSA-PKCS1-v1_5
          if ((algorithm as any).name === 'RSASSA-PKCS1-v1_5') {
            throw new Error('Simulated signature import failure')
          }
          return originalImportKey(
            format,
            keyData,
            algorithm,
            extractable,
            keyUsages
          )
        }
      )

    try {
      // Parse legacy keys
      const parsedPubKey = await service.parseCryptoKeyString(
        legacyPubKeyString,
        AllowedKeyType.PUBLIC
      )
      const parsedPrivKey = await service.parseCryptoKeyString(
        legacyPrivKeyString,
        AllowedKeyType.PRIVATE
      )

      // Ensure it imported them as RSA-OAEP keys (legacy)
      expect(parsedPubKey.algorithm.name).toBe('RSA-OAEP')
      expect(parsedPubKey.usages).toContain('encrypt')

      expect(parsedPrivKey.algorithm.name).toBe('RSA-OAEP')
      expect(parsedPrivKey.usages).toContain('decrypt')
    } finally {
      importKeySpy.mockRestore()
    }
  })
})
