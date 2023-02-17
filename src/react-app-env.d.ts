/// <reference types="react-scripts" />

// TODO: Type the rest of the API and contribute it to the wormhole-crypto project
declare module 'wormhole-crypto' {
  export class Keychain {
    constructor(key: Uint8Array, salt: Uint8Array)

    encryptStream(ReadableStream): Promise<ReadableStream>

    decryptStream(ReadableStream): Promise<ReadableStream>
  }

  export const plaintextSize = number => number

  export const encryptedSize = number => number
}
