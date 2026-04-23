import { FileTransfer, setStreamSaverMitm } from 'secure-file-transfer'

import { streamSaverUrl } from 'config/streamSaverUrl'

setStreamSaverMitm(streamSaverUrl)

export class FileTransferService {
  fileTransfer: FileTransfer

  constructor(rtcConfig: RTCConfiguration) {
    this.fileTransfer = new FileTransfer({
      webtorrentInstanceOpts: {
        tracker: {
          rtcConfig,
        },
      },
    })
  }
}
