import { FileTransfer, setStreamSaverMitm } from 'secure-file-transfer'
import { PeerRoom } from 'lib/PeerRoom'
import { TrysteroFileTransfer } from './TrysteroFileTransfer'
import { trackerUrls } from 'config/trackerUrls'
import { streamSaverUrl } from 'config/streamSaverUrl'

setStreamSaverMitm(streamSaverUrl)

export class FileTransferService {
  fileTransfer: FileTransfer | TrysteroFileTransfer

  constructor({
    rtcConfig,
    peerRoom,
    useDirectFileTransferNetworking,
  }: {
    rtcConfig: RTCConfiguration
    peerRoom: PeerRoom
    useDirectFileTransferNetworking: boolean
  }) {
    if (useDirectFileTransferNetworking) {
      this.fileTransfer = new TrysteroFileTransfer(peerRoom)
    } else {
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
}
