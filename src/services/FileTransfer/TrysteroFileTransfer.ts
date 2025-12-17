import { PeerRoom } from 'lib/PeerRoom'
import {
  FileTransfer,
  OfferOpts,
  DownloadOpts,
  TorrentFile,
} from 'secure-file-transfer'
import { v4 as uuid } from 'uuid'
import { ActionSender, ActionReceiver } from 'trystero'
import streamSaver from 'streamsaver'

const FILE_TRANSFER_CHUNK = 'file-transfer-chunk'
const FILE_TRANSFER_META = 'file-transfer-meta'

interface FileTransferMeta {
  transferId: string
  files: {
    name: string
    size: number
    type: string
  }[]
}

export class TrysteroFileTransfer implements Partial<FileTransfer> {
  private offers = new Map<
    string,
    { files: FileList | File[]; sender: ActionSender<any> }
  >()
  private downloads = new Map<string, ActionReceiver<any>>()

  constructor(private peerRoom: PeerRoom) {}

  async offer(
    files: File[] | FileList,
    password?: string,
    offerOpts: OfferOpts = {}
  ): Promise<string> {
    const transferId = uuid()
    const selfId = this.peerRoom.getSelfId()
    const magnetURI = `${selfId}:${transferId}`

    const [sendChunk] = this.peerRoom.makeAction(
      `${FILE_TRANSFER_CHUNK}:${transferId}`,
      selfId
    )
    const [sendMeta, getMeta] = this.peerRoom.makeAction(
      `${FILE_TRANSFER_META}:${transferId}`,
      selfId
    )

    getMeta((meta, peerId) => {
      if (meta.transferId === transferId) {
        this.sendFiles(files, sendChunk, peerId)
      }
    })

    this.offers.set(magnetURI, { files, sender: sendMeta })
    return magnetURI
  }

  private async sendFiles(
    files: File[] | FileList,
    sendChunk: ActionSender<any>,
    peerId: string
  ) {
    for (const file of Array.from(files)) {
      await this.sendFile(file, sendChunk, peerId)
    }
  }

  private async sendFile(
    file: File,
    sendChunk: ActionSender<any>,
    peerId: string
  ) {
    const stream = file.stream()
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      sendChunk(value, peerId)
    }
  }

  async download(
    magnetURI: string,
    password?: string,
    downloadOpts: DownloadOpts = {}
  ): Promise<TorrentFile[]> {
    const [offererId, transferId] = magnetURI.split(':')
    const [sendChunk, getChunk] = this.peerRoom.makeAction(
      `${FILE_TRANSFER_CHUNK}:${transferId}`,
      offererId
    )
    const [sendMeta, getMeta] = this.peerRoom.makeAction(
      `${FILE_TRANSFER_META}:${transferId}`,
      offererId
    )

    return new Promise(resolve => {
      let writer: WritableStreamDefaultWriter
      getMeta((meta: FileTransferMeta) => {
        const file = meta.files[0]
        const writable = streamSaver.createWriteStream(file.name, {
          size: file.size,
        })
        writer = writable.getWriter()
      })

      getChunk((chunk: Uint8Array) => {
        writer.write(chunk)
      })

      sendMeta({ transferId })
    })
  }

  isOffering(magnetURI: string): boolean {
    return this.offers.has(magnetURI)
  }

  rescind(magnetURI: string): void {
    this.offers.delete(magnetURI)
  }

  rescindAll(): void {
    this.offers.clear()
  }

  destroy(): void {
    this.rescindAll()
  }
}
