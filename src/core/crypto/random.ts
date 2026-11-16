import { EncryptionService } from 'core/crypto/Encryption'

/**
 * `byteLength` cryptographically random bytes as unpadded base64url: safe in
 * a URL or a JSON string, and the shape file keys and identity challenges
 * are checked against.
 */
export const generateRandomBase64Url = (byteLength: number): string => {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(byteLength))

  return EncryptionService.arrayBufferToBase64(bytes.buffer)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
