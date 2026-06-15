// NOTE: Much of what's here is derived from various ChatGPT responses:
//
//  - https://gist.github.com/jeremyckahn/cbb6107e7de6c83b620960a19266055e
//  - https://gist.github.com/jeremyckahn/c49ca17a849ecf35c5f957ffde956cf4

export enum AllowedKeyType {
  PUBLIC,
  PRIVATE,
}

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const binary = String.fromCharCode(...new Uint8Array(buffer))
  return btoa(binary)
}

export const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
}

// The primary algorithm used for peer verification.
// RSASSA-PKCS1-v1_5 is a signature scheme (signing/verification) used in the
// new signature-based peer authentication flow to prove a peer's identity.
const algorithmName = 'RSASSA-PKCS1-v1_5'

// The legacy algorithm historically used for peer verification in Chitchatter.
// Previously, authentication relied on public-key encryption/decryption (challenge-response)
// via RSA-OAEP. With the migration to signature-based authentication, RSA-OAEP keys are
// considered legacy and are automatically rotated to signature keys upon booting the app.
const legacyAlgorithmName = 'RSA-OAEP'

const algorithmHash = 'SHA-256'

export class EncryptionService {
  cryptoKeyStub: CryptoKey = {
    algorithm: { name: 'STUB-ALGORITHM' },
    extractable: false,
    type: 'private',
    usages: [],
  }

  // TODO: Make this configurable
  generateKeyPair = async (): Promise<CryptoKeyPair> => {
    const keyPair = await window.crypto.subtle.generateKey(
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

  encodePassword = async (roomId: string, password: string) => {
    const data = new TextEncoder().encode(`${roomId}_${password}`)
    const digest = await window.crypto.subtle.digest('SHA-256', data)
    const bytes = new Uint8Array(digest)
    const encodedPassword = window.btoa(String.fromCharCode(...bytes))

    return encodedPassword
  }

  stringifyCryptoKey = async (cryptoKey: CryptoKey) => {
    const exportedKey = await window.crypto.subtle.exportKey(
      cryptoKey.type === 'public' ? 'spki' : 'pkcs8',
      cryptoKey
    )

    const exportedKeyAsString = arrayBufferToBase64(exportedKey)

    return exportedKeyAsString
  }

  parseCryptoKeyString = async (keyString: string, type: AllowedKeyType) => {
    const format = type === AllowedKeyType.PUBLIC ? 'spki' : 'pkcs8'
    const keyData = base64ToArrayBuffer(keyString)

    try {
      // Try importing as the NEW signature key
      return await window.crypto.subtle.importKey(
        format,
        keyData,
        {
          name: algorithmName,
          hash: algorithmHash,
        },
        true,
        type === AllowedKeyType.PUBLIC ? ['verify'] : ['sign']
      )
    } catch (_error) {
      // Fall back to importing as a LEGACY encryption key
      return await window.crypto.subtle.importKey(
        format,
        keyData,
        {
          name: legacyAlgorithmName,
          hash: algorithmHash,
        },
        true,
        type === AllowedKeyType.PUBLIC ? ['encrypt'] : ['decrypt']
      )
    }
  }

  signString = async (
    privateKey: CryptoKey,
    plaintext: string
  ): Promise<ArrayBuffer> => {
    if (privateKey.algorithm.name === 'STUB-ALGORITHM')
      return new ArrayBuffer(0)
    const encodedText = new TextEncoder().encode(plaintext)
    const signature = await window.crypto.subtle.sign(
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
      !(signature instanceof ArrayBuffer || ArrayBuffer.isView(signature))
    ) {
      return false
    }
    const encodedText = new TextEncoder().encode(plaintext)
    const isVerified = await window.crypto.subtle.verify(
      algorithmName,
      publicKey,
      signature,
      encodedText
    )
    return isVerified
  }

  encryptString = async (publicKey: CryptoKey, plaintext: string) => {
    const encodedText = new TextEncoder().encode(plaintext)
    const encryptedData = await crypto.subtle.encrypt(
      legacyAlgorithmName,
      publicKey,
      encodedText
    )

    return encryptedData
  }

  decryptString = async (privateKey: CryptoKey, encryptedData: ArrayBuffer) => {
    const decryptedArrayBuffer = await crypto.subtle.decrypt(
      legacyAlgorithmName,
      privateKey,
      encryptedData
    )

    const decryptedString = new TextDecoder().decode(decryptedArrayBuffer)

    return decryptedString
  }
}

export const encryption = new EncryptionService()
