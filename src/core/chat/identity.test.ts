import { beforeAll, describe, expect, it } from 'vitest'

import {
  deriveUserId,
  deriveUserIdFromKey,
  generateIdentityChallenge,
  getIdentityVerificationMessage,
  IdentityStatement,
  isIdentityChallenge,
  parsePeerPublicKey,
  signIdentityChallenge,
  verifyIdentityChallenge,
} from 'core/chat/identity'
import { encryption, EncryptionService } from 'core/crypto/Encryption'
import { PeerVerificationState } from 'core/models/chat'

const statement: IdentityStatement = {
  roomId: 'room-1',
  userId: 'user-1',
  proverPeerId: 'peer-1',
  challenge: 'c'.repeat(43),
}

describe('getIdentityVerificationMessage', () => {
  it.each<[keyof IdentityStatement, string]>([
    ['roomId', 'room-2'],
    ['userId', 'user-2'],
    ['proverPeerId', 'peer-2'],
    ['challenge', 'd'.repeat(43)],
  ])('differs when the %s differs', (field, value) => {
    expect(
      getIdentityVerificationMessage({ ...statement, [field]: value })
    ).not.toBe(getIdentityVerificationMessage(statement))
  })

  it('cannot be made ambiguous by separators inside a field', () => {
    // With plain `_` concatenation these two statements were the same bytes.
    expect(
      getIdentityVerificationMessage({
        ...statement,
        roomId: 'a_b',
        userId: 'c',
      })
    ).not.toBe(
      getIdentityVerificationMessage({
        ...statement,
        roomId: 'a',
        userId: 'b_c',
      })
    )
  })

  it('is not the static statement the previous protocol signed', () => {
    expect(getIdentityVerificationMessage(statement)).not.toBe(
      `${statement.roomId}_${statement.userId}`
    )
  })
})

describe('generateIdentityChallenge', () => {
  it('makes well-formed challenges', () => {
    expect(isIdentityChallenge(generateIdentityChallenge())).toBe(true)
  })

  it('never repeats a challenge', () => {
    const challenges = new Set(
      Array.from({ length: 100 }, generateIdentityChallenge)
    )

    expect(challenges.size).toBe(100)
  })
})

describe('isIdentityChallenge', () => {
  it.each<[string, unknown]>([
    ['too short', 'a'.repeat(42)],
    ['too long', 'a'.repeat(44)],
    ['non-base64url characters', `${'a'.repeat(42)}+`],
    ['a non-string', 42],
  ])('rejects %s', (_, value) => {
    expect(isIdentityChallenge(value)).toBe(false)
  })
})

describe('signIdentityChallenge / verifyIdentityChallenge', () => {
  let keyPair: CryptoKeyPair

  beforeAll(async () => {
    keyPair = await encryption.generateKeyPair()
  })

  const sign = (signed: IdentityStatement = statement) =>
    signIdentityChallenge({
      encryptionService: encryption,
      privateKey: keyPair.privateKey,
      statement: signed,
    })

  const verify = (
    identitySignatureBase64: string,
    checked: IdentityStatement = statement,
    publicKey: CryptoKey = keyPair.publicKey
  ) =>
    verifyIdentityChallenge({
      encryptionService: encryption,
      publicKey,
      identitySignatureBase64,
      statement: checked,
    })

  it('round-trips a signature as VERIFIED', async () => {
    await expect(verify(await sign())).resolves.toBe(
      PeerVerificationState.VERIFIED
    )
  })

  it.each<[keyof IdentityStatement, string]>([
    ['roomId', 'a-different-room'],
    ['userId', 'somebody-else'],
    ['proverPeerId', 'a-relaying-peer'],
    ['challenge', 'd'.repeat(43)],
  ])(
    'reports UNVERIFIED when the verifier expects a different %s',
    async (field, value) => {
      const signature = await sign()

      await expect(
        verify(signature, { ...statement, [field]: value })
      ).resolves.toBe(PeerVerificationState.UNVERIFIED)
    }
  )

  it('reports UNVERIFIED for a tampered signature rather than throwing', async () => {
    const tampered = new Uint8Array(
      EncryptionService.base64ToArrayBuffer(await sign())
    )

    tampered[0] = tampered[0] ^ 0xff

    await expect(
      verify(EncryptionService.arrayBufferToBase64(tampered.buffer))
    ).resolves.toBe(PeerVerificationState.UNVERIFIED)
  })

  it('reports UNVERIFIED when another key signed the statement', async () => {
    const impostor = await encryption.generateKeyPair()

    const signature = await signIdentityChallenge({
      encryptionService: encryption,
      privateKey: impostor.privateKey,
      statement,
    })

    await expect(verify(signature)).resolves.toBe(
      PeerVerificationState.UNVERIFIED
    )
  })

  it('reports UNVERIFIED for garbage rather than throwing', async () => {
    await expect(verify('AAAA')).resolves.toBe(PeerVerificationState.UNVERIFIED)
  })
})

describe('parsePeerPublicKey', () => {
  it('round-trips a stringified public key', async () => {
    const { publicKey } = await encryption.generateKeyPair()
    const publicKeyString = await encryption.stringifyCryptoKey(publicKey)

    const parsed = await parsePeerPublicKey(encryption, publicKeyString)

    if (!parsed) throw new Error('expected the key to parse')

    expect(parsed.type).toBe('public')
    await expect(encryption.stringifyCryptoKey(parsed)).resolves.toBe(
      publicKeyString
    )
  })

  it('returns null for an unparseable key rather than throwing', async () => {
    await expect(
      parsePeerPublicKey(encryption, 'not-a-key')
    ).resolves.toBeNull()
  })
})

describe('deriveUserId', () => {
  let keyPairs: CryptoKeyPair[]

  beforeAll(async () => {
    keyPairs = await Promise.all([
      encryption.generateKeyPair(),
      encryption.generateKeyPair(),
    ])
  })

  it('is the SHA-256 of the key, as 64 lowercase hex digits', async () => {
    const publicKeyString = await encryption.stringifyCryptoKey(
      keyPairs[0].publicKey
    )

    await expect(deriveUserId(publicKeyString)).resolves.toMatch(
      /^[0-9a-f]{64}$/
    )
  })

  it('is the same however the key is held', async () => {
    const { publicKey } = keyPairs[0]
    const publicKeyString = await encryption.stringifyCryptoKey(publicKey)

    await expect(deriveUserIdFromKey(encryption, publicKey)).resolves.toBe(
      await deriveUserId(publicKeyString)
    )
  })

  it('differs between keys', async () => {
    const [a, b] = await Promise.all(
      keyPairs.map(({ publicKey }) =>
        deriveUserIdFromKey(encryption, publicKey)
      )
    )

    expect(a).not.toBe(b)
  })
})
