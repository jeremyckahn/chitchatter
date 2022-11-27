import { WebTorrent as WebTorrentType, Torrent } from 'webtorrent'
// @ts-ignore
import streamSaver from 'streamsaver'
// @ts-ignore
import idbChunkStore from 'idb-chunk-store'
import { detectIncognito } from 'detectincognitojs'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'
import { trackerUrls } from 'config/trackerUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'

streamSaver.mitm = streamSaverUrl

interface DownloadOpts {
  doSave?: boolean
  onProgress?: (progress: number) => void
}

export class FileTransfer {
  private webTorrentClient = new (WebTorrent as unknown as WebTorrentType)()

  private torrents: Record<Torrent['magnetURI'], Torrent> = {}

  private async saveTorrentFiles(torrent: Torrent) {
    for (const file of torrent.files) {
      try {
        await new Promise<void>((resolve, reject) => {
          const fileStream = streamSaver.createWriteStream(file.name, {
            size: file.length,
          })

          const writeStream = fileStream.getWriter()
          const readStream = file.createReadStream()
          let aborted = false

          const handleData = async (data: ArrayBuffer) => {
            try {
              await writeStream.write(data)
            } catch (e) {
              writeStream.abort()
              readStream.off('data', handleData)
              aborted = true
              reject()
            }
          }

          const handleBeforePageUnloadForFile = () => {
            // Clean up any broken downloads
            writeStream.abort()
          }

          window.addEventListener('beforeunload', handleBeforePageUnloadForFile)

          const handleEnd = async () => {
            window.removeEventListener(
              'beforeunload',
              handleBeforePageUnloadForFile
            )

            if (aborted) return

            await writeStream.close()
            resolve()
          }

          readStream.on('data', handleData).on('end', handleEnd)
        })
      } catch (e) {
        throw new Error('Download aborted')
      }
    }
  }

  constructor() {
    window.addEventListener('beforeunload', this.handleBeforePageUnload)
  }

  async download(magnetURI: string, { onProgress, doSave }: DownloadOpts = {}) {
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
        await this.saveTorrentFiles(torrent)
      } catch (e) {
        torrent.off('download', handleDownload)

        // Propagate error to the UI
        throw e
      }
    }

    return torrent.files
  }

  async offer(files: Parameters<typeof this.webTorrentClient.seed>[0]) {
    const { isPrivate } = await detectIncognito()

    const torrent = await new Promise<Torrent>(res => {
      this.webTorrentClient.seed(
        files,
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
