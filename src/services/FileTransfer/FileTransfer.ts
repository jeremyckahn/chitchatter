import WebTorrent, { Torrent, TorrentFile } from 'webtorrent'
// @ts-ignore
import createTorrent from 'create-torrent'
import parseTorrent from 'parse-torrent'
import streamSaver from 'streamsaver'
// @ts-ignore
import { Keychain, plaintextSize, encryptedSize } from 'wormhole-crypto'
// @ts-ignore
import idbChunkStore from 'idb-chunk-store'
import { detectIncognito } from 'detectincognitojs'

import { trackerUrls } from 'config/trackerUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'
// @ts-ignore
import blockIterator from 'block-iterator'

import { ReadableWebToNodeStream } from 'readable-web-to-node-stream'
// @ts-ignore
import nodeToWebStream from 'readable-stream-node-to-web'

streamSaver.mitm = streamSaverUrl

interface NamedReadableWebToNodeStream extends NodeJS.ReadableStream {
  name?: string
}

const getKeychain = (password: string) => {
  const encoder = new TextEncoder()
  const keyLength = 16
  const padding = new Array(keyLength).join('0')
  const key = password.concat(padding).slice(0, keyLength)
  const salt = window.location.origin.concat(padding).slice(0, keyLength)

  const keychain = new Keychain(encoder.encode(key), encoder.encode(salt))

  return keychain
}

interface DownloadOpts {
  doSave?: boolean
  onProgress?: (progress: number) => void
}

export class FileTransfer {
  private webTorrentClient = new WebTorrent()

  private torrents: Record<Torrent['magnetURI'], Torrent> = {}

  private async saveTorrentFiles(torrent: Torrent, password: string) {
    for (const file of torrent.files) {
      try {
        const readStream = await this.getDecryptedFileReadStream(file, password)

        const writeStream = streamSaver.createWriteStream(file.name, {
          size: plaintextSize(file.length),
        })

        await readStream.pipeTo(writeStream)
      } catch (e) {
        console.error(e)
        throw new Error('Download aborted')
      }
    }
  }

  constructor() {
    window.addEventListener('beforeunload', this.handleBeforePageUnload)
  }

  async getDecryptedFileReadStream(file: TorrentFile, password: string) {
    const keychain = getKeychain(password)
    const readStream: ReadableStream = await keychain.decryptStream(
      nodeToWebStream(file.createReadStream())
    )

    return readStream
  }

  async download(
    magnetURI: string,
    password: string,
    { onProgress, doSave }: DownloadOpts = {}
  ) {
    let torrent = this.torrents[magnetURI]

    if (!torrent) {
      const { isPrivate } = await detectIncognito()

      torrent = await new Promise<Torrent>(res => {
        this.webTorrentClient.add(
          magnetURI,
          {
            announce: trackerUrls,
            // If the user is using their browser's private mode, IndexedDB
            // will be unavailable and idbChunkStore will break all transfers.
            // In that case, fall back to the default in-memory data store.
            store: isPrivate ? undefined : idbChunkStore,
            destroyStoreOnDestroy: true,
          },
          torrent => {
            res(torrent)
          }
        )
      })

      this.torrents[torrent.magnetURI] = torrent
    }

    const handleDownload = () => {
      onProgress?.(torrent.progress)
    }

    torrent.on('download', handleDownload)

    if (doSave) {
      try {
        await this.saveTorrentFiles(torrent, password)
      } catch (e) {
        torrent.off('download', handleDownload)

        // Propagate error to the UI
        throw e
      }
    }

    return torrent.files
  }

  async offer(files: File[] | FileList, password: string) {
    const { isPrivate } = await detectIncognito()

    const filesToSeed: File[] =
      files instanceof FileList ? Array.from(files) : files

    const pieceLength = 16 * 1024

    const fileToEncryptedStoreMap: Map<File, () => ReadableStream<Buffer>> =
      new Map()

    const tempStores: idbChunkStore[] = []

    for (const file of filesToSeed) {
      const tempStore = new idbChunkStore(pieceLength, {
        name: `${file.name} - temp`,
        length: encryptedSize(file.size),
      })

      tempStores.push(tempStore)

      const encryptedStream = await getKeychain(password).encryptStream(
        file.stream()
      )

      const blockStream = blockIterator(encryptedStream, pieceLength, {
        zeroPadding: false,
      })

      let numberOfChunks = 0
      let i = 0
      for await (const chunk of blockStream) {
        // eslint-disable-next-line no-loop-func
        await new Promise<void>((resolve, reject) => {
          tempStore.put(i, chunk, (err?: Error) => {
            if (err) return reject(err)

            resolve()
          })
        })

        i++
        numberOfChunks = i
      }

      const streamFactory = () => {
        let i = 0

        const readableStream = new ReadableStream<Buffer>({
          async pull(controller) {
            const buffer = await new Promise<Buffer>(resolve => {
              tempStore.get(
                i,
                undefined,
                (_err: Error | null, buffer: Buffer) => {
                  resolve(buffer)
                }
              )
            })

            i++

            const done = i > numberOfChunks

            if (done) {
              controller.close()
            } else {
              controller.enqueue(buffer)
            }
          },
        })

        return readableStream
      }

      fileToEncryptedStoreMap.set(file, streamFactory)
    }

    const encryptedFileStreams = await Promise.all(
      filesToSeed.map(async file => {
        const streamFactory = fileToEncryptedStoreMap.get(file)

        if (!streamFactory) {
          throw new Error(`streamFactory is undefined`)
        }

        const encryptedStream = streamFactory()

        // WebTorrent only accepts Node-style ReadableStreams
        const nodeStream: NamedReadableWebToNodeStream =
          new ReadableWebToNodeStream(
            encryptedStream
            // ReadableWebToNodeStream is the same as NodeJS.ReadableStream.
            // The library's typing is wrong.
          ) as any as NodeJS.ReadableStream

        nodeStream.name = file.name

        return nodeStream
      })
    )

    const torrentBuffer = await new Promise<ArrayBuffer>(resolve => {
      createTorrent(
        encryptedFileStreams,
        {
          pieceLength,
        },
        (err: Error | null, torrent: ArrayBuffer) => {
          if (err) throw err

          resolve(torrent)
        }
      )
    })

    const parsedTorrent = await parseTorrent(torrentBuffer)
    const preloadedStore = new idbChunkStore(pieceLength, {
      name: `${parsedTorrent.name} - ${parsedTorrent.infoHash.slice(0, 8)}`,
      length: parsedTorrent.length,
    })

    let i = 0
    for (const file of filesToSeed) {
      const streamFactory = fileToEncryptedStoreMap.get(file)

      if (!streamFactory) {
        throw new Error(`streamFactory is undefined`)
      }

      const encryptedStream = streamFactory()

      // @ts-ignore
      for await (const chunk of encryptedStream) {
        // eslint-disable-next-line no-loop-func
        await new Promise<void>((resolve, reject) => {
          preloadedStore.put(i, chunk, (err?: Error) => {
            if (err) return reject(err)

            resolve()
          })
        })

        i++
      }
    }

    const encryptedFiles = await Promise.all(
      filesToSeed.map(async file => {
        const streamFactory = fileToEncryptedStoreMap.get(file)

        if (!streamFactory) {
          throw new Error(`streamFactory is undefined`)
        }

        const encryptedStream = streamFactory()

        const encryptedFile = Object.setPrototypeOf(
          {
            ...file,
            name: file.name,
            size: encryptedSize(file.size),
            stream: () => encryptedStream,
          },
          File.prototype
        )

        return encryptedFile
      })
    )

    const offer = await new Promise<Torrent>(res => {
      this.webTorrentClient.seed(
        encryptedFiles,
        {
          announce: trackerUrls,
          // If the user is using their browser's private mode, IndexedDB will
          // be unavailable and idbChunkStore will break all transfers. In that
          // case, fall back to the default in-memory data store.
          store: isPrivate ? undefined : idbChunkStore,
          destroyStoreOnDestroy: true,
          preloadedStore,
        },
        torrent => {
          res(torrent)
        }
      )
    })

    for (const store of tempStores) {
      await new Promise<void>(resolve => {
        store.destroy(() => {
          resolve()
        })
      })
    }

    const { magnetURI } = offer
    this.torrents[magnetURI] = offer

    return magnetURI
  }

  rescind(magnetURI: string) {
    const torrent = this.torrents[magnetURI]

    if (torrent) {
      torrent.destroy()
    } else {
      console.error(`Attempted to clean up nonexistent torrent: ${magnetURI}`)
    }

    delete this.torrents[magnetURI]
  }

  rescindAll() {
    for (const magnetURI in this.torrents) {
      this.rescind(magnetURI)
    }
  }

  isOffering(magnetURI: string) {
    return magnetURI in this.torrents
  }

  handleBeforePageUnload = () => {
    this.rescindAll()
  }
}

export const fileTransfer = new FileTransfer()
