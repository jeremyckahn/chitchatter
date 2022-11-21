import { WebTorrent as WebTorrentType, Torrent } from 'webtorrent'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'

export class TorrentClient {
  private webTorrentClient = new (WebTorrent as unknown as WebTorrentType)()

  async add(magnetURI: string) {
    const torrent = await new Promise<Torrent>(res => {
      this.webTorrentClient.add(magnetURI, torrent => {
        res(torrent)
      })
    })

    return torrent
  }

  async seed(file: File) {
    const torrent = await new Promise<Torrent>(res => {
      this.webTorrentClient.seed(file, torrent => {
        res(torrent)
      })
    })

    return torrent
  }
}

export const torrentClient = new TorrentClient()
