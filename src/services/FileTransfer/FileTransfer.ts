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

  // FIXME: Delete the chunk store after it is no longer needed.
  private async streamTorrentFilesToDisk(torrent: Torrent) {
    return new Promise<void>(res => {
      for (const file of torrent.files) {
        const fileStream = streamSaver.createWriteStream(file.name)
        const writer = fileStream.getWriter()

        file
          .createReadStream()
          .on('data', data => {
            writer.write(data)
          })
          .on('end', () => {
            writer.close()
            res()
          })
      }
    })
  }

  async download(magnetURI: string) {
    let torrent = this.torrents[magnetURI]

    if (!torrent) {
      torrent = await new Promise<Torrent>(res => {
        this.webTorrentClient.add(
          magnetURI,
          { announce: trackerUrls, store: idbChunkStore },
          torrent => {
            res(torrent)
          }
        )
      })

      this.torrents[torrent.magnetURI] = torrent
    }

    await this.streamTorrentFilesToDisk(torrent)
  }

  async offer(files: FileList) {
    const torrent = await new Promise<Torrent>(res => {
      this.webTorrentClient.seed(
        files,
        { announce: trackerUrls, store: idbChunkStore },
        torrent => {
          res(torrent)
        }
      )
    })

    return torrent.magnetURI
  }
}

export const fileTransfer = new FileTransfer()
