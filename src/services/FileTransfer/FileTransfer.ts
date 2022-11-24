// @ts-ignore
import idbChunkStore from 'idb-chunk-store'
import { WebTorrent as WebTorrentType, Torrent } from 'webtorrent'
// @ts-ignore
import streamSaver from 'streamsaver'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'
import { trackerUrls } from 'config/trackerUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'

streamSaver.mitm = streamSaverUrl

interface DownloadOpts {
  onProgress?: (progress: number) => void
}

export class FileTransfer {
  private webTorrentClient = new (WebTorrent as unknown as WebTorrentType)()

  private torrents: Record<Torrent['magnetURI'], Torrent> = {}

  private async saveTorrentFiles(torrent: Torrent) {
    for (const file of torrent.files) {
      try {
        await new Promise<void>((resolve, reject) => {
          const fileStream = streamSaver.createWriteStream(file.name)
          const writer = fileStream.getWriter()

          let aborted = false

          file
            .createReadStream()
            .on('data', async data => {
              try {
                await writer.write(data)
              } catch (e) {
                await writer.abort()
                aborted = true
                reject(new Error('Download aborted'))
              }
            })
            .on('end', async () => {
              if (aborted) return

              await writer.close()
              resolve()
            })
        })
      } catch (e) {
        break
      }
    }
  }

  constructor() {
    window.addEventListener('beforeunload', this.handlePageUnload)
  }

  async download(magnetURI: string, { onProgress }: DownloadOpts = {}) {
    let torrent = this.torrents[magnetURI]

    if (!torrent) {
      torrent = await new Promise<Torrent>(res => {
        this.webTorrentClient.add(
          magnetURI,
          {
            announce: trackerUrls,
            store: idbChunkStore,
            destroyStoreOnDestroy: true,
          },
          torrent => {
            res(torrent)
          }
        )
      })

      this.torrents[torrent.magnetURI] = torrent
    }

    if (onProgress) {
      torrent.on('download', () => {
        onProgress(torrent.progress)
      })
    }

    await this.saveTorrentFiles(torrent)
  }

  async offer(files: FileList) {
    const torrent = await new Promise<Torrent>(res => {
      this.webTorrentClient.seed(
        files,
        {
          announce: trackerUrls,
          store: idbChunkStore,
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

  handlePageUnload = () => {
    for (const torrent of Object.values(this.torrents)) {
      this.rescind(torrent.magnetURI)
    }
  }
}

export const fileTransfer = new FileTransfer()
