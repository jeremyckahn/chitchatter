import { WebTorrent as WebTorrentType, Torrent } from 'webtorrent'
import streamSaver from 'streamsaver'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'

// FIXME: Make this configurable
streamSaver.mitm = 'https://jeremyckahn.github.io/StreamSaver.js/mitm.html'

export class FileTransfer {
  private webTorrentClient = new (WebTorrent as unknown as WebTorrentType)()

  private torrents: Record<Torrent['magnetURI'], Torrent> = {}

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
        this.webTorrentClient.add(magnetURI, torrent => {
          res(torrent)
        })
      })

      this.torrents[torrent.magnetURI] = torrent
    }

    await this.streamTorrentFilesToDisk(torrent)
  }

  async offer(files: FileList) {
    const torrent = await new Promise<Torrent>(res => {
      this.webTorrentClient.seed(files, torrent => {
        res(torrent)
      })
    })

    return torrent.magnetURI
  }
}

export const fileTransfer = new FileTransfer()
