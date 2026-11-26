// NOTE: Much of what's here is derived from various ChatGPT responses:
//
//  - https://gist.github.com/jeremyckahn/cbb6107e7de6c83b620960a19266055e
//  - https://gist.github.com/jeremyckahn/c49ca17a849ecf35c5f957ffde956cf4

export enum AllowedKeyType {
  PUBLIC,
  PRIVATE,
}

// The primary algorithm used for peer verification.
// RSASSA-PKCS1-v1_5 is a signature scheme (signing/verification) used in the
// new signature-based peer authentication flow to prove a peer's identity.
const algorithmName = 'RSASSA-PKCS1-v1_5'

const algorithmHash = 'SHA-256'

/**
 * Generations of the private room secret. A secret's version is part of its
 * serialized form (see {@link getRoomSecretVersion}), so a room link records
 * which derivation produced it.
 */
export enum RoomSecretVersion {
  /** `base64(SHA-256(roomId + "_" + password))`. No work factor. */
  V1 = 'v1',
  /** `"v2." + base64(PBKDF2-SHA256(v1 digest, salt, iterations))`. */
  V2 = 'v2',
}

/**
 * PBKDF2-HMAC-SHA256 work factor for private room secrets: the OWASP
 * recommended minimum. Lowering it makes offline guessing of room passwords
 * cheaper and changes every room's key, so it is pinned by a test.
 */
export const roomSecretKdfIterations = 600_000

const roomSecretBits = 256

const roomSecretSaltPrefix = 'chitchatter:room-secret:'

const roomSecretVersionSeparator = '.'

// Base64 of exactly 32 bytes: 43 significant characters and one pad.
const base64Sha256Pattern = /^[A-Za-z0-9+/]{43}=$/

/**
 * Identifies which derivation produced a serialized room secret, or returns
 * `undefined` when the value is not a well-formed secret of any version.
 */
export const getRoomSecretVersion = (
  secret: string
): RoomSecretVersion | undefined => {
  const v2Prefix = `${RoomSecretVersion.V2}${roomSecretVersionSeparator}`

  if (secret.startsWith(v2Prefix)) {
    return base64Sha256Pattern.test(secret.slice(v2Prefix.length))
      ? RoomSecretVersion.V2
      : undefined
  }

  return base64Sha256Pattern.test(secret) ? RoomSecretVersion.V1 : undefined
}

export class EncryptionService {
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer))

    return btoa(binary)
  }

  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes.buffer
  }

  cryptoKeyStub: CryptoKey = {
    algorithm: { name: 'STUB-ALGORITHM' },
    extractable: false,
    type: 'private',
    usages: [],
  }

  // TODO: Make this configurable
  generateKeyPair = async (): Promise<CryptoKeyPair> => {
    const keyPair = await globalThis.crypto.subtle.generateKey(
      {
        name: algorithmName,
        hash: algorithmHash,
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      },
      true,
      ['sign', 'verify']
    )

    return keyPair
  }

  /**
   * Derives the secret a private room hands to the transport from the room's
   * password. The result is what encrypts every signalling offer announced to
   * the public trackers, so it is stretched with PBKDF2: anybody who knows the
   * room name can collect those offers and test password guesses offline, and
   * the work factor is the only thing that makes each guess expensive.
   *
   * The derivation is chained through the legacy (v1) digest so that room
   * links created before the work factor was added can still be upgraded
   * locally — see {@link resolveRoomLinkSecret}.
   */
  encodePassword = async (roomId: string, password: string): Promise<string> =>
    this.stretchLegacyRoomSecret(
      roomId,
      await this.hashLegacyRoomSecret(roomId, password)
    )

  /**
   * Turns the `secret` carried by a shared room link into the secret to join
   * with. Current (v2) secrets are used as-is; legacy (v1) secrets from links
   * copied before the work factor was added are upgraded to v2. Anything else
   * — a truncated or tampered link — yields `undefined`, and the host should
   * ask for the password instead.
   */
  resolveRoomLinkSecret = async (
    roomId: string,
    linkSecret: string
  ): Promise<string | undefined> => {
    switch (getRoomSecretVersion(linkSecret)) {
      case RoomSecretVersion.V2:
        return linkSecret
      case RoomSecretVersion.V1:
        return this.stretchLegacyRoomSecret(roomId, linkSecret)
      case undefined:
        return undefined
    }
  }

  /**
   * The original single-SHA-256 room secret. It must never be handed to the
   * transport any more: it is only an intermediate value of the v2 derivation
   * and the format of legacy room links.
   */
  private hashLegacyRoomSecret = async (
    roomId: string,
    password: string
  ): Promise<string> => {
    const data = new TextEncoder().encode(`${roomId}_${password}`)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data)

    return EncryptionService.arrayBufferToBase64(digest)
  }

  private stretchLegacyRoomSecret = async (
    roomId: string,
    legacySecret: string
  ): Promise<string> => {
    const { subtle } = globalThis.crypto

    const baseKey = await subtle.importKey(
      'raw',
      EncryptionService.base64ToArrayBuffer(legacySecret),
      'PBKDF2',
      false,
      ['deriveBits']
    )

    const derivedBits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: new TextEncoder().encode(
          `${roomSecretSaltPrefix}${RoomSecretVersion.V2}:${roomId}`
        ),
        iterations: roomSecretKdfIterations,
      },
      baseKey,
      roomSecretBits
    )

    return `${RoomSecretVersion.V2}${roomSecretVersionSeparator}${EncryptionService.arrayBufferToBase64(derivedBits)}`
  }

  stringifyCryptoKey = async (cryptoKey: CryptoKey) => {
    const exportedKey = await globalThis.crypto.subtle.exportKey(
      cryptoKey.type === 'public' ? 'spki' : 'pkcs8',
      cryptoKey
    )

    const exportedKeyAsString =
      EncryptionService.arrayBufferToBase64(exportedKey)

    return exportedKeyAsString
  }

  parseCryptoKeyString = async (keyString: string, type: AllowedKeyType) => {
    const format = type === AllowedKeyType.PUBLIC ? 'spki' : 'pkcs8'
    const keyData = EncryptionService.base64ToArrayBuffer(keyString)

    return await globalThis.crypto.subtle.importKey(
      format,
      keyData,
      {
        name: algorithmName,
        hash: algorithmHash,
      },
      true,
      type === AllowedKeyType.PUBLIC ? ['verify'] : ['sign']
    )
  }

  signString = async (
    privateKey: CryptoKey,
    plaintext: string
  ): Promise<ArrayBuffer> => {
    if (privateKey.algorithm.name === 'STUB-ALGORITHM')
      return new ArrayBuffer(0)
    const encodedText = new TextEncoder().encode(plaintext)
    const signature = await globalThis.crypto.subtle.sign(
      algorithmName,
      privateKey,
      encodedText
    )

    return signature
  }

  verifySignature = async (
    publicKey: CryptoKey,
    signature: ArrayBuffer,
    plaintext: string
  ): Promise<boolean> => {
    if (publicKey.algorithm.name === 'STUB-ALGORITHM') return true
    if (
      !signature ||
      !(
        signature instanceof ArrayBuffer ||
        ArrayBuffer.isView(signature) ||
        (signature as any).constructor?.name === 'ArrayBuffer'
      )
    ) {
      return false
    }
    const encodedText = new TextEncoder().encode(plaintext)
    const isVerified = await globalThis.crypto.subtle.verify(
      algorithmName,
      publicKey,
      signature,
      encodedText
    )

    return isVerified
  }
}

export const encryption = new EncryptionService()
