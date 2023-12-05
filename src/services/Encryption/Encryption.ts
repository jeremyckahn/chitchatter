export enum AllowedKeyType {
  PUBLIC,
  PRIVATE,
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const binary = String.fromCharCode(...new Uint8Array(buffer))
  return btoa(binary)
}

export class EncryptionService {
  static cryptoKeyStub: CryptoKey = {
    algorithm: { name: 'STUB-ALGORITHM' },
    extractable: false,
    type: 'private',
    usages: [],
  }

  // TODO: Make this configurable
  static generateKeyPair = async (): Promise<CryptoKeyPair> => {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    )

    return keyPair
  }

  static encodePassword = async (roomId: string, password: string) => {
    const data = new TextEncoder().encode(`${roomId}_${password}`)
    const digest = await window.crypto.subtle.digest('SHA-256', data)
    const bytes = new Uint8Array(digest)
    const encodedPassword = window.btoa(String.fromCharCode(...bytes))

    return encodedPassword
  }

  // FIXME: Use this to serialize CryptoKeys for IndexedDB storage
  static convertCryptoKeyToString = async (
    key: CryptoKeyPair,
    type: AllowedKeyType
  ) => {
    const exportedKey = await window.crypto.subtle.exportKey(
      type === AllowedKeyType.PUBLIC ? 'spki' : 'pkcs8',
      type === AllowedKeyType.PUBLIC ? key.publicKey : key.privateKey
    )

    const exportedAsString = arrayBufferToBase64(exportedKey)

    return exportedAsString
  }
}
