import { afterEach, describe, it, expect, vi } from 'vitest'

import { itemAt } from 'test-utils/itemAt'

import {
  AllowedKeyType,
  EncryptionService,
  RoomSecretVersion,
  getRoomSecretVersion,
  roomSecretKdfIterations,
} from './Encryption'

describe('EncryptionService', () => {
  const service = new EncryptionService()

  describe('arrayBufferToBase64', () => {
    it('should convert an ArrayBuffer to a base64 string', () => {
      const data = new Uint8Array(new TextEncoder().encode('Hello'))
      const base64 = EncryptionService.arrayBufferToBase64(data.buffer)

      expect(base64).toBe('SGVsbG8=')
    })

    it('should return an empty string for an empty buffer', () => {
      const data = new Uint8Array(0)
      const base64 = EncryptionService.arrayBufferToBase64(data.buffer)

      expect(base64).toBe('')
    })
  })

  describe('base64ToArrayBuffer', () => {
    it('should convert a base64 string to an ArrayBuffer', () => {
      const decodedBuffer = EncryptionService.base64ToArrayBuffer('SGVsbG8=')
      const expected = new Uint8Array(new TextEncoder().encode('Hello'))

      expect(new Uint8Array(decodedBuffer)).toEqual(expected)
    })

    it('should return an empty buffer for an empty string', () => {
      const decodedBuffer = EncryptionService.base64ToArrayBuffer('')

      expect(new Uint8Array(decodedBuffer)).toEqual(new Uint8Array(0))
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

  describe('generateKeyPair', () => {
    it('should generate a valid RSASSA-PKCS1-v1_5 key pair', async () => {
      const keyPair = await service.generateKeyPair()

      expect(keyPair.publicKey).toBeDefined()
      expect(keyPair.privateKey).toBeDefined()
      expect(keyPair.publicKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
      expect(keyPair.privateKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
      expect(keyPair.publicKey.usages).toContain('verify')
      expect(keyPair.privateKey.usages).toContain('sign')
    })
  })

  describe('signString', () => {
    it('should return empty buffer when signing with a stub key', async () => {
      const signature = await service.signString(
        service.cryptoKeyStub,
        'hello world'
      )

      expect(signature.byteLength).toBe(0)
    })

    it('should sign a string using private key', async () => {
      const keyPair = await service.generateKeyPair()
      const plaintext = 'This is a secret message.'
      const signature = await service.signString(keyPair.privateKey, plaintext)

      expect(signature.byteLength).toBeGreaterThan(0)
    })
  })

  describe('verifySignature', () => {
    it('should return true when verifying with a stub key', async () => {
      const signature = new ArrayBuffer(0)
      const isVerified = await service.verifySignature(
        service.cryptoKeyStub,
        signature,
        'hello world'
      )

      expect(isVerified).toBe(true)
    })

    it('should handle invalid signature inputs', async () => {
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

    it('should verify correct signature using public key, and fail for invalid/modified signatures', async () => {
      const keyPair = await service.generateKeyPair()
      const plaintext = 'This is a secret message.'
      const signature = await service.signString(keyPair.privateKey, plaintext)

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

      // Corrupt the first byte
      modifiedSignature[0] = itemAt(modifiedSignature, 0) ^ 1
      const isVerifiedCorrupted = await service.verifySignature(
        keyPair.publicKey,
        modifiedSignature.buffer,
        plaintext
      )

      expect(isVerifiedCorrupted).toBe(false)
    })
  })

  describe('stringifyCryptoKey', () => {
    it('should convert a CryptoKey to a base64 string representation', async () => {
      const keyPair = await service.generateKeyPair()
      const pubKeyString = await service.stringifyCryptoKey(keyPair.publicKey)
      const privKeyString = await service.stringifyCryptoKey(keyPair.privateKey)

      expect(typeof pubKeyString).toBe('string')
      expect(pubKeyString.length).toBeGreaterThan(0)
      expect(typeof privKeyString).toBe('string')
      expect(privKeyString.length).toBeGreaterThan(0)
    })
  })

  describe('parseCryptoKeyString', () => {
    it('should parse a stringified key back into a CryptoKey', async () => {
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

  // Known-answer vectors computed independently with Python's hashlib, so a
  // change to any input of the derivation (salt, iterations, chaining) fails
  // here rather than silently splitting rooms between old and new clients:
  //
  //   v1 = sha256(f'{roomId}_{password}')
  //   v2 = pbkdf2_hmac('sha256', v1, f'chitchatter:room-secret:v2:{roomId}',
  //                    600000, 32)
  const roomId = 'team-sync-2026'
  const password = 'sunshine42'
  const legacySecret = 'pn9emZ19UNxo/0Ml/imYLDIu43ihuVNpGsmBglQR5OQ='
  const expectedSecret = 'v2.HkewEwK6hKoGia0Kcg25zaypd5eEMDAwbMjltBdOY5A='

  describe('encodePassword', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('derives the v2 room secret from the room id and password', async () => {
      expect(await service.encodePassword(roomId, password)).toBe(
        expectedSecret
      )
    })

    it('never yields the unstretched legacy digest', async () => {
      // Regression: the single-SHA-256 digest encrypted the offers relayed by
      // public trackers, giving anybody who knew the room name an offline
      // password oracle at hash speed.
      const secret = await service.encodePassword(roomId, password)

      expect(secret).not.toBe(legacySecret)
      expect(secret).not.toContain(legacySecret)
    })

    it('stretches with PBKDF2-SHA256 at the pinned work factor', async () => {
      const deriveBits = vi.spyOn(globalThis.crypto.subtle, 'deriveBits')

      await service.encodePassword(roomId, password)

      expect(deriveBits).toHaveBeenCalledOnce()
      expect(itemAt(itemAt(deriveBits.mock.calls, 0), 0)).toMatchObject({
        name: 'PBKDF2',
        hash: 'SHA-256',
        iterations: 600_000,
      })
      expect(roomSecretKdfIterations).toBeGreaterThanOrEqual(600_000)
    })

    it('derives different secrets for different rooms', async () => {
      expect(await service.encodePassword('other-room', password)).not.toBe(
        expectedSecret
      )
    })

    it('derives different secrets for different passwords', async () => {
      expect(await service.encodePassword(roomId, 'sunshine43')).not.toBe(
        expectedSecret
      )
    })
  })

  describe('resolveRoomLinkSecret', () => {
    it('upgrades a legacy (v1) link secret to the v2 secret', async () => {
      expect(await service.resolveRoomLinkSecret(roomId, legacySecret)).toBe(
        expectedSecret
      )
    })

    it('meets a peer who typed the password after upgrading an old link', async () => {
      expect(await service.resolveRoomLinkSecret(roomId, legacySecret)).toBe(
        await service.encodePassword(roomId, password)
      )
    })

    it('uses a current (v2) link secret as-is', async () => {
      expect(await service.resolveRoomLinkSecret(roomId, expectedSecret)).toBe(
        expectedSecret
      )
    })

    it.each([
      ['an empty value', ''],
      ['a truncated v1 secret', legacySecret.slice(0, 20)],
      ['a truncated v2 secret', expectedSecret.slice(0, 20)],
      ['an unknown version', `v9.${legacySecret}`],
      ['a raw password', password],
    ])('rejects %s', async (_description, linkSecret) => {
      expect(
        await service.resolveRoomLinkSecret(roomId, linkSecret)
      ).toBeUndefined()
    })
  })

  describe('getRoomSecretVersion', () => {
    it('identifies a v1 secret', () => {
      expect(getRoomSecretVersion(legacySecret)).toBe(RoomSecretVersion.V1)
    })

    it('identifies a v2 secret', () => {
      expect(getRoomSecretVersion(expectedSecret)).toBe(RoomSecretVersion.V2)
    })

    it('rejects a v2 prefix with a malformed digest', () => {
      expect(getRoomSecretVersion('v2.not-base64')).toBeUndefined()
    })
  })
})
