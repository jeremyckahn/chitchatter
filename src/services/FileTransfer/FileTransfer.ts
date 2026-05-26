import { FileTransfer, setStreamSaverMitm } from 'secure-file-transfer'

import { relayUrls } from 'config/relayUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'

setStreamSaverMitm(streamSaverUrl)

export class FileTransferService {
  fileTransfer: FileTransfer

  constructor(rtcConfig: RTCConfiguration) {
    this.fileTransfer = new FileTransfer({
      torrentOpts: {
        announce: relayUrls,
      },
      webtorrentInstanceOpts: {
        tracker: {
          rtcConfig,
        },
      },
    })
  }
}
