import { webcrypto } from 'node:crypto'

import { describe, it, expect } from 'vitest'

import { AllowedKeyType, EncryptionService } from './Encryption'

// Always wrap window.crypto.subtle methods to ensure VM/realm context buffer
// compatibility. Needed for the CI environment's Node 20
// TODO: Update CI Node version and delete this shim
if (typeof window !== 'undefined') {
  const originalSubtle = window.crypto?.subtle || webcrypto.subtle
  const subtle = {} as any

  const toNodeBuffer = (val: any): any => {
    if (!val) return val

    if (val instanceof ArrayBuffer || val.constructor?.name === 'ArrayBuffer') {
      return Buffer.from(val)
    }

    if (ArrayBuffer.isView(val)) {
      const view = val as any

      return Buffer.from(view.buffer, view.byteOffset, view.byteLength)
    }

    return val
  }

  const wrapMethod = (name: string) => {
    subtle[name] = async (...args: any[]) => {
      const wrappedArgs = args.map(arg => {
        if (
          arg instanceof ArrayBuffer ||
          arg?.constructor?.name === 'ArrayBuffer' ||
          ArrayBuffer.isView(arg)
        ) {
          return toNodeBuffer(arg)
        }

        return arg
      })

      return (originalSubtle as any)[name](...wrappedArgs)
    }
  }

  ;[
    'generateKey',
    'digest',
    'exportKey',
    'importKey',
    'sign',
    'verify',
    'encrypt',
    'decrypt',
  ].forEach(wrapMethod)

  if (window.crypto) {
    try {
      Object.defineProperty(window.crypto, 'subtle', {
        value: subtle,
        writable: true,
        configurable: true,
      })
    } catch {
      for (const key of Object.keys(subtle)) {
        try {
          ;(window.crypto.subtle as any)[key] = subtle[key]
        } catch {
          // Ignore write failure
        }
      }
    }
  } else {
    Object.defineProperty(window, 'crypto', {
      value: {
        ...webcrypto,
        subtle,
      },
      writable: true,
      configurable: true,
    })
  }

  // Align JSDOM window.ArrayBuffer with Node's global ArrayBuffer to prevent
  // cross-realm instanceof issues
  window.ArrayBuffer = globalThis.ArrayBuffer
}

describe('EncryptionService Static Helpers', () => {
  it('should convert an ArrayBuffer to base64 and back', () => {
    const data = new Uint8Array(new TextEncoder().encode('Hello'))
    const base64 = EncryptionService.arrayBufferToBase64(data.buffer)

    expect(base64).toBe('SGVsbG8=')

    const decodedBuffer = EncryptionService.base64ToArrayBuffer(base64)

    expect(new Uint8Array(decodedBuffer)).toEqual(data)
  })

  it('should handle empty buffers', () => {
    const data = new Uint8Array(0)
    const base64 = EncryptionService.arrayBufferToBase64(data.buffer)

    expect(base64).toBe('')

    const decodedBuffer = EncryptionService.base64ToArrayBuffer(base64)

    expect(new Uint8Array(decodedBuffer)).toEqual(data)
  })

  it('should preserve binary data integrity across all byte values 0-255', () => {
    const data = new Uint8Array(256)

    for (let i = 0; i < 256; i++) {
      data[i] = i
    }

    const base64 = EncryptionService.arrayBufferToBase64(data.buffer)
    const decodedBuffer = EncryptionService.base64ToArrayBuffer(base64)

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
})
