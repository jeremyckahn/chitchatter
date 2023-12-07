// NOTE: Much of what's here is derived from various ChatGPT responses:
//
//  - https://gist.github.com/jeremyckahn/cbb6107e7de6c83b620960a19266055e
//  - https://gist.github.com/jeremyckahn/c49ca17a849ecf35c5f957ffde956cf4

export enum AllowedKeyType {
  PUBLIC,
  PRIVATE,
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const binary = String.fromCharCode(...new Uint8Array(buffer))
  return btoa(binary)
}

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes.buffer
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

  static convertCryptoKeyToString = async (
    cryptoKey: CryptoKey,
    type: AllowedKeyType
  ) => {
    const exportedKey = await window.crypto.subtle.exportKey(
      type === AllowedKeyType.PUBLIC ? 'spki' : 'pkcs8',
      cryptoKey
    )

    const exportedAsString = arrayBufferToBase64(exportedKey)

    return exportedAsString
  }

  static convertStringToCryptoKey = async (
    stringKey: string,
    type: AllowedKeyType
  ) => {
    const importedKey = await window.crypto.subtle.importKey(
      type === AllowedKeyType.PUBLIC ? 'spki' : 'pkcs8',
      base64ToArrayBuffer(stringKey),
      {
        name: 'RSA-OAEP',
        hash: {
          name: 'SHA-256',
        },
      },
      false,
      type === AllowedKeyType.PUBLIC ? ['encrypt'] : ['decrypt']
    )

    return importedKey
  }
}
