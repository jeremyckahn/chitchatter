import { FileTransfer, setStreamSaverMitm } from 'secure-file-transfer'

import { trackerUrls } from 'config/trackerUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'

setStreamSaverMitm(streamSaverUrl)

/**
 * The part of a WebTorrent client `destroy` relies on. WebTorrent calls back
 * with `null` on success, an `Error` or occasionally a bare string otherwise.
 */
interface DestroyableClient {
  destroy: (callback: (error: Error | string | null) => void) => void
}

const isDestroyableClient = (client: unknown): client is DestroyableClient =>
  typeof client === 'object' &&
  client !== null &&
  'destroy' in client &&
  typeof client.destroy === 'function'

export class FileTransferService {
  fileTransfer: FileTransfer

  private destroying: Promise<void> | null = null

  constructor(rtcConfig: RTCConfiguration) {
    this.fileTransfer = new FileTransfer({
      torrentOpts: {
        announce: trackerUrls,
      },
      webtorrentInstanceOpts: {
        tracker: {
          rtcConfig,
        },
      },
    })
  }

  /**
   * Rescinds every offer and destroys the WebTorrent client behind this
   * service, closing its tracker sockets and peer connections. The service
   * cannot be used afterwards.
   *
   * `secure-file-transfer`'s own `destroy()` only rescinds the offers — it
   * leaves the client running — so the client is destroyed here too. Calling
   * this more than once returns the first call's promise rather than
   * destroying the client twice, which WebTorrent throws on.
   */
  destroy(): Promise<void> {
    this.destroying ??= new Promise<void>((resolve, reject) => {
      this.fileTransfer.destroy()

      // `secure-file-transfer` exposes no other way to reach the client it
      // owns, and nothing short of destroying the client releases it. The
      // field is private, so its published declaration carries no type: it is
      // read as `unknown` and checked rather than trusted, so a library update
      // that renames or reshapes it fails loudly here instead of silently
      // leaking the client again.
      const client: unknown = this.fileTransfer['webTorrentClient']

      if (!isDestroyableClient(client)) {
        reject(
          new Error(
            'secure-file-transfer no longer exposes a WebTorrent client to destroy'
          )
        )

        return
      }

      client.destroy(error => {
        if (error) {
          reject(typeof error === 'string' ? new Error(error) : error)
        } else {
          resolve()
        }
      })
    })

    return this.destroying
  }
}
