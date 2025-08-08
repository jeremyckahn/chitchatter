import { FileTransfer, setStreamSaverMitm } from 'secure-file-transfer'

import { trackerUrls } from 'config/trackerUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'

setStreamSaverMitm(streamSaverUrl)

export class FileTransferService {
  fileTransfer: FileTransfer

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
}
