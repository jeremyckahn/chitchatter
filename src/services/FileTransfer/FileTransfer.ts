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

export class FileTransfer {
  private webTorrentClient = new (WebTorrent as unknown as WebTorrentType)()

  private torrents: Record<Torrent['magnetURI'], Torrent> = {}

  private async saveTorrentFiles(torrent: Torrent) {
    return new Promise<void>((resolve, reject) => {
      for (const file of torrent.files) {
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
      }
    })
  }

  constructor() {
    window.addEventListener('beforeunload', this.handlePageUnload)
  }

  async download(magnetURI: string) {
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
  }

  handlePageUnload = () => {
    for (const torrent of Object.values(this.torrents)) {
      this.rescind(torrent.magnetURI)
    }
  }
}

export const fileTransfer = new FileTransfer()
