import { PeerVerificationState } from 'core/models/chat'
import { AllowedKeyType, EncryptionService } from 'core/crypto/Encryption'
import { generateRandomBase64Url } from 'core/crypto/random'

/**
 * How many random bytes an identity challenge holds: 256 bits, so a verifier's
 * challenge is never repeated and cannot be predicted ahead of time.
 */
export const IDENTITY_CHALLENGE_BYTE_LENGTH = 32

/** Unpadded base64 spends four characters on every three bytes, rounding up. */
const identityChallengeCharacterLength = Math.ceil(
  (IDENTITY_CHALLENGE_BYTE_LENGTH * 4) / 3
)

const identityChallengePattern = new RegExp(
  `^[A-Za-z0-9_-]{${identityChallengeCharacterLength}}$`
)

/**
 * Separates identity proofs from anything else this key might ever sign, and
 * from the earlier `${roomId}_${userId}` statement, which carried no challenge.
 */
const identityProofDomain = 'chitchatter-identity-proof-v2'

/**
 * Whether `value` has the shape of a challenge {@link generateIdentityChallenge}
 * makes. Checked exactly, so that a peer cannot ask this client to sign an
 * arbitrarily long or structured string.
 */
export const isIdentityChallenge = (value: unknown): value is string =>
  typeof value === 'string' && identityChallengePattern.test(value)

/**
 * A fresh, unpredictable challenge for one peer connection, as unpadded
 * base64url.
 */
export const generateIdentityChallenge = (): string =>
  generateRandomBase64Url(IDENTITY_CHALLENGE_BYTE_LENGTH)

export interface IdentityStatement {
  roomId: string
  /** The user id the prover claims. */
  userId: string
  /**
   * The transport peer id of the prover, as the prover knows itself and as
   * the verifier sees the frame arrive from.
   */
  proverPeerId: string
  /** The verifier's challenge for this connection. */
  challenge: string
}

/**
 * The plaintext a peer signs to prove, *right now and on this connection*,
 * that it controls the private key matching the public key it advertises.
 *
 * Each part closes a way of reusing a proof:
 *
 * - `roomId`: a proof from one room is worthless in another.
 * - `challenge`: chosen at random by the verifier for this exchange, so a
 *   proof cannot be captured once and presented again later. A static
 *   statement made the proof a bearer token for anyone who had received it.
 * - `proverPeerId`: a peer cannot relay a challenge to the real key holder
 *   and pass the answer off as its own, because the key holder signs its own
 *   peer id and the verifier checks the id the answer actually arrived from.
 *
 * Serialized as a JSON array so that no choice of room id (which may contain
 * any character) can make two different statements produce the same bytes.
 */
export const getIdentityVerificationMessage = ({
  roomId,
  userId,
  proverPeerId,
  challenge,
}: IdentityStatement): string =>
  JSON.stringify([identityProofDomain, roomId, userId, proverPeerId, challenge])

/** Signs an {@link IdentityStatement}, returning the signature as base64. */
export const signIdentityChallenge = async ({
  encryptionService,
  privateKey,
  statement,
}: {
  encryptionService: EncryptionService
  privateKey: CryptoKey
  statement: IdentityStatement
}): Promise<string> => {
  const identitySignature = await encryptionService.signString(
    privateKey,
    getIdentityVerificationMessage(statement)
  )

  return EncryptionService.arrayBufferToBase64(identitySignature)
}

/**
 * The user id that belongs to a public key: the SHA-256 of its SPKI encoding,
 * as lowercase hex.
 *
 * Deriving the id from the key is what binds the two. A random id is only a
 * label, and any peer could pair it with a key of its own and prove possession
 * of *that* key. A derived id cannot be claimed without the private key that
 * produced it, so a verified peer is the user its id names.
 *
 * `publicKeyString` is the base64 SPKI that `EncryptionService.stringifyCryptoKey`
 * produces and peers send in their metadata. The hash covers the bytes as
 * sent, so the key a peer signs with is exactly the key its id was derived from.
 */
export const deriveUserId = async (
  publicKeyString: string
): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    EncryptionService.base64ToArrayBuffer(publicKeyString)
  )

  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** {@link deriveUserId} for a key that is already a `CryptoKey`. */
export const deriveUserIdFromKey = async (
  encryptionService: EncryptionService,
  publicKey: CryptoKey
): Promise<string> =>
  deriveUserId(await encryptionService.stringifyCryptoKey(publicKey))

/**
 * Parses a peer's advertised public key. `null` when it is not a usable key:
 * the caller ignores such a peer's metadata outright.
 */
export const parsePeerPublicKey = async (
  encryptionService: EncryptionService,
  publicKeyString: string
): Promise<CryptoKey | null> => {
  try {
    return await encryptionService.parseCryptoKeyString(
      publicKeyString,
      AllowedKeyType.PUBLIC
    )
  } catch {
    return null
  }
}

/**
 * Checks a peer's answer to an identity challenge against the public key it
 * advertised.
 *
 * A failed or malformed signature yields UNVERIFIED rather than throwing: a
 * peer who cannot prove its identity is still a peer in the room, and the UI
 * says so. Only a valid signature over this exact statement yields VERIFIED.
 */
export const verifyIdentityChallenge = async ({
  encryptionService,
  publicKey,
  identitySignatureBase64,
  statement,
}: {
  encryptionService: EncryptionService
  publicKey: CryptoKey
  identitySignatureBase64: string
  statement: IdentityStatement
}): Promise<PeerVerificationState> => {
  let isVerified = false

  try {
    isVerified = await encryptionService.verifySignature(
      publicKey,
      EncryptionService.base64ToArrayBuffer(identitySignatureBase64),
      getIdentityVerificationMessage(statement)
    )
  } catch {
    isVerified = false
  }

  return isVerified
    ? PeerVerificationState.VERIFIED
    : PeerVerificationState.UNVERIFIED
}
