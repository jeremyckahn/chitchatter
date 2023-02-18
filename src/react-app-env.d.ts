/// <reference types="react-scripts" />

declare module 'wormhole-crypto' {
  /**
   * The encrypted byte range that is needed to decrypt the client's specified range.
   */
  export type ByteRange = {
    offset: number
    length: number
  }

  /**
   * The metadata buffer to encrypt.
   */
  export type Meta = Uint8Array

  /**
   * A WHATWG readable stream used as a data source for the plaintext stream.
   */
  export type EncryptedStream = ReadableStream

  /**
   * @param streams An array of `ReadableStream` objects, one for each of the requested ranges.
   * @returns Contains the plaintext data for the client's desired byte range.
   */
  export type DecryptFn = (streams: ReadableStream[]) => ReadableStream

  export type DecryptedStreamRange = {
    ranges: ByteRange[]
    decrypt: DecryptFn
  }

  export class Keychain {
    /**
     * Create a new keychain object. The keychain can be used to create encryption streams, decryption streams, and to encrypt or decrypt a "metadata" buffer.
     *
     * @param key The main key. This should be 16 bytes in length. If a string is given, then it should be a base64-encoded string. If the argument is null, then a key will be automatically generated.
     * @param salt The salt. This should be 16 bytes in length. If a string is given, then it should be a base64-encoded string. If this argument is null, then a salt will be automatically generated.
     */
    constructor(
      key: Uint8Array | string | null = null,
      salt: Uint8Array | string | null = null
    )

    /**
     * The main key.
     */
    key: Uint8Array

    /**
     * The main key as a base64-encoded string.
     */
    keyB64: string

    /**
     * The salt.
     *
     * Implementation note: The salt is used to derive the (internal) metadata key and authentication token.
     */
    salt: Uint8Array

    /**
     * The salt as a base64-encoded string.
     */
    saltB64: string

    /**
     * Returns a `Promise` which resolves to the authentication token. By default, the authentication token is automatically derived from the main key using HKDF SHA-256.
     *
     * In Wormhole, the authentication token is used to communicate with the server and prove that the client has permission to fetch data for a room. Without a valid authentication token, the server will not return the encrypted room metadata or allow downloading the encrypted file data.
     *
     * Since the authentication token is derived from the main key, the client presents it to the Wormhole server as a "reader token" to prove that it is in possession of the main key without revealing the main key to the server.
     *
     * For destructive operations, like modifying the room, the client instead presents a "writer token", which is not derived from the main key but is provided by the server to the room creator who overrides the keychain authentication token by calling `keychain.setAuthToken(authToken)` with the "writer token".
     */
    authToken(): Promise<Uint8Array>

    /**
     * Returns a `Promise` that resolves to the authentication token as a base64-encoded string.
     */
    authTokenB64(): Promise<string>

    /**
     * Returns a `Promise` that resolves to the HTTP header value to be provided to the Wormhole server. It contains the authentication token.
     */
    authHeader(): Promise<string>

    /**
     * Update the keychain authentication token to `authToken`.
     *
     * @param authToken The authentication token. This should be 16 bytes in length. If a `string` is given, then it should be a base64-encoded string. If this argument is `null`, then an authentication token will be automatically generated.
     */
    setAuthToken(authToken: Uint8Array | string | null = null): void

    /**
     * @param stream A WHATWG readable stream used as a data source for the encrypted stream.
     *
     * @returns A `Promise` that resolves to a `ReadableStream` encryption stream that consumes the data in `stream` and returns an encrypted version. Data is encrypted with [Encrypted Content-Encoding for HTTP (RFC 8188)](https://tools.ietf.org/html/rfc8188).
     */
    encryptStream(stream: ReadableStream): Promise<EncryptedStream>

    /**
     * Returns a `Promise` that resolves to a `ReadableStream` decryption stream that consumes the data in `encryptedStream` and returns a plaintext version.
     *
     * @param encryptedStream A WHATWG readable stream that was returned from encryptStream.
     * @returns A `Promise` that resolves to a `ReadableStream` decryption stream that
consumes the data in `encryptedStream` and returns a plaintext version.
     */
    decryptStream(encryptedStream: EncryptedStream): Promise<ReadableStream>

    /**
     * Returns a `Promise` that resolves to a object containing `ranges`, which is an array of objects containing `offset` and `length` integers specifying the encrypted byte ranges that are needed to decrypt the client's specified range, and a `decrypt` function.
     *
     * Once the client has gathered a stream for each byte range in `ranges`, the client should call `decrypt(streams)`, where `streams` is an array of `ReadableStream` objects, one for each of the requested ranges. `decrypt` will then return a `ReadableStream` containing the plaintext data for the client's desired byte range.
     */
    decryptStreamRange(
      offset: number,
      length: number,
      totalEncryptedLength: number
    ): Promise<DecryptedStreamRange>

    /**
     * Implementation note: The metadata key is automatically derived from the main key using HKDF SHA-256. The value is not user-controlled.
     *
     * Implementation note: The initialization vector (IV) is automatically generated and included in the encrypted output. No need to generate it or to manage it separately from the encrypted output.
     *
     * @returns A `Promise` that resolves to an encrypted version of `meta`. The metadata is encrypted with AES-GCM.
     */
    encryptMeta(meta: Meta): Promise<Uint8Array>

    /**
     * @param encryptedMeta The encrypted metadata buffer to decrypt.
     * @returns A `Promise` that resolves to a decrypted version of `encryptedMeta`.
     */
    decryptMeta(encryptedMeta: Uint8Array): Promise<Uint8Array>
  }

  /**
   * Given an encrypted size, return the corresponding plaintext size.
   */
  export function plaintextSize(encryptedSize: number): number

  /**
   * Given a plaintext size, return the corresponding encrypted size.
   */
  export function encryptedSize(plaintextSize: number): number
}

declare module 'abstract-chunk-store' {
  type GetCallback = (err: Error | null, buffer: Buffer) => void

  export interface ChunkStore {
    /**
     * Create a new chunk store. Chunks must have a length of `chunkLength`.
     */
    constructor(chunkLength: number)

    /**
     * Add a new chunk to the storage. `index` should be an integer.
     */
    put(
      index: number,
      chunkBuffer: Buffer,
      cb: (err: Error | null) => void
    ): void

    /**
     * Retrieve a chunk stored. `index` should be an integer.
     */
    get(index: number, cb: GetCallback): void
    get(
      index: number,
      options: { offset?: number; length?: number },
      cb: GetCallback
    ): void

    /**
     * Close the underlying resource, e.g. if the store is backed by a file, this would close the file descriptor.
     */
    close(cb: (err: Error | null) => void)

    /**
     * Destroy the file data, e.g. if the store is backed by a file, this would delete the file from the filesystem.
     */
    destroy(cb: (err: Error | null) => void)

    /**
     * Expose the chunk length from the constructor so that code that receives a chunk store can know what size of chunks to write.
     */
    chunkLength: number
  }
}

declare module 'idb-chunk-store' {
  import { TorrentOptions } from 'webtorrent'
  import { ChunkStore } from 'abstract-chunk-store'

  export default function idbChunkStore(
    chunkLength: number,
    opts?: Partial<{
      /**
       * A name to separate the contents of different stores
       */
      name: string
    }> &
      TorrentOptions.store
  ): ChunkStore
}

declare module 'readable-stream-node-to-web' {
  export const WEBSTREAM_SUPPORT: boolean

  export default function nodeToWeb(
    readableStream: NodeJS.ReadableStream
  ): ReadableStream
}
