import { PeerVerificationState } from 'core/models/chat'
import { AllowedKeyType, EncryptionService } from 'core/crypto/Encryption'

/**
 * The plaintext each peer signs to prove it controls the private key matching
 * the public key it advertises. Binding the room id in means a signature
 * captured in one room cannot be replayed in another.
 */
export const getIdentityVerificationMessage = (
  roomId: string,
  userId: string
): string => `${roomId}_${userId}`

export interface IdentityProof {
  publicKeyString: string
  identitySignatureBase64: string
}

export const signIdentity = async ({
  encryptionService,
  publicKey,
  privateKey,
  roomId,
  userId,
}: {
  encryptionService: EncryptionService
  publicKey: CryptoKey
  privateKey: CryptoKey
  roomId: string
  userId: string
}): Promise<IdentityProof> => {
  const publicKeyString = await encryptionService.stringifyCryptoKey(publicKey)
  const identitySignature = await encryptionService.signString(
    privateKey,
    getIdentityVerificationMessage(roomId, userId)
  )

  return {
    publicKeyString,
    identitySignatureBase64:
      EncryptionService.arrayBufferToBase64(identitySignature),
  }
}

export interface VerifiedIdentity {
  publicKey: CryptoKey
  verificationState: PeerVerificationState
}

/**
 * Parses a peer's advertised public key and checks their signature against it.
 *
 * An unparseable key or a failed check yields UNVERIFIED rather than throwing:
 * a peer who cannot prove its identity is still a peer in the room, and the UI
 * says so. Only a verified signature yields VERIFIED.
 */
export const verifyPeerIdentity = async ({
  encryptionService,
  publicKeyString,
  identitySignatureBase64,
  roomId,
  peerUserId,
}: {
  encryptionService: EncryptionService
  publicKeyString: string
  identitySignatureBase64: string
  roomId: string
  peerUserId: string
}): Promise<VerifiedIdentity | null> => {
  let publicKey: CryptoKey

  try {
    publicKey = await encryptionService.parseCryptoKeyString(
      publicKeyString,
      AllowedKeyType.PUBLIC
    )
  } catch {
    return null
  }

  let isVerified = false

  try {
    isVerified = await encryptionService.verifySignature(
      publicKey,
      EncryptionService.base64ToArrayBuffer(identitySignatureBase64),
      getIdentityVerificationMessage(roomId, peerUserId)
    )
  } catch {
    isVerified = false
  }

  return {
    publicKey,
    verificationState: isVerified
      ? PeerVerificationState.VERIFIED
      : PeerVerificationState.UNVERIFIED,
  }
}
