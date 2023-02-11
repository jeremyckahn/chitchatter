import WebTorrent, { Torrent, TorrentFile } from 'webtorrent'
import streamSaver from 'streamsaver'
// @ts-ignore
import { Keychain, plaintextSize } from 'wormhole-crypto'
// @ts-ignore
import idbChunkStore from 'idb-chunk-store'
import { detectIncognito } from 'detectincognitojs'

import { trackerUrls } from 'config/trackerUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'

import { ReadableWebToNodeStream } from 'readable-web-to-node-stream'
// @ts-ignore
import nodeToWebStream from 'readable-stream-node-to-web'

streamSaver.mitm = streamSaverUrl

interface NamedReadableWebToNodeStream extends ReadableWebToNodeStream {
  name?: string
}

const getKeychain = (password: string) => {
  const encoder = new TextEncoder()
  const keyLength = 16
  const key = password
    .concat(new Array(keyLength).join('0'))
    .slice(0, keyLength)
  const salt = window.location.origin
    .concat(new Array(keyLength).join('0'))
    .slice(0, keyLength)

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

    // FIXME: Show a notification that file is being encrypted
    const encryptedFiles = await Promise.all(
      filesToSeed.map(async file => {
        const encryptedStream = await getKeychain(password).encryptStream(
          file.stream()
        )

        // WebTorrent only accepts Node-style ReadableStreams
        const nodeStream: NamedReadableWebToNodeStream =
          new ReadableWebToNodeStream(encryptedStream)

        nodeStream.name = file.name
        return nodeStream
      })
    )

    const torrent = await new Promise<Torrent>(res => {
      this.webTorrentClient.seed(
        // @ts-ignore
        encryptedFiles,
        {
          announce: trackerUrls,
          // If the user is using their browser's private mode, IndexedDB will
          // be unavailable and idbChunkStore will break all transfers. In that
          // case, fall back to the default in-memory data store.
          store: isPrivate ? undefined : idbChunkStore,
          destroyStoreOnDestroy: true,
        },
        torrent => {
          res(torrent)
        }
      )
    })

    const { magnetURI } = torrent
    this.torrents[magnetURI] = torrent

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
