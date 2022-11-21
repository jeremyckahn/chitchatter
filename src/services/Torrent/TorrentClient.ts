import { WebTorrent as WebTorrentType } from 'webtorrent'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'

export class TorrentClient {
  private webTorrentClient = new (WebTorrent as unknown as WebTorrentType)()

  add(...args: Parameters<typeof this.webTorrentClient.add>) {
    this.webTorrentClient.add(...args)
  }

  seed(...args: Parameters<typeof this.webTorrentClient.seed>) {
    this.webTorrentClient.seed(...args)
  }
}

export const torrentClient = new TorrentClient()
