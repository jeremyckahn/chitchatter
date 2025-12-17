import { PeerRoom } from 'lib/PeerRoom'
import {
  FileTransfer,
  TorrentFile,
} from 'secure-file-transfer'
import { v4 as uuid } from 'uuid'
import { ActionSender, DataPayload } from 'trystero'
import streamSaver from 'streamsaver'
import { PeerAction } from 'models/network'
import { EventEmitter } from 'events'

interface FileTransferMeta extends Record<string, any> {
  transferId: string
  files: {
    name: string
    size: number
    type: string
  }[]
}

export class TrysteroFileTransfer extends EventEmitter implements FileTransfer {
  private offers = new Map<
    string,
    { files: FileList | File[]; sender: ActionSender<any> }
  >()

  constructor(private peerRoom: PeerRoom) {
    super()
  }

  async offer(files: File[] | FileList): Promise<string> {
    const transferId = uuid()
    const selfId = this.peerRoom.getPeers()[0]
    const magnetURI = `${selfId}:${transferId}`

    const [sendChunk] = this.peerRoom.makeAction<DataPayload>(
      PeerAction.FILE_TRANSFER_CHUNK,
      transferId
    )
    const [sendMeta, getMeta] = this.peerRoom.makeAction<FileTransferMeta>(
      PeerAction.FILE_TRANSFER_META,
      transferId
    )

    getMeta((meta, peerId) => {
      if (meta.transferId === transferId) {
        const fileArray = Array.from(files)
        const fileMetas = fileArray.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
        }))
        sendMeta({ transferId, files: fileMetas }, peerId)
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

    sendChunk(null, peerId)
  }

  async download(magnetURI: string): Promise<TorrentFile[]> {
    const [offererId, transferId] = magnetURI.split(':')
    const [, getChunk] = this.peerRoom.makeAction<DataPayload>(
      PeerAction.FILE_TRANSFER_CHUNK,
      transferId
    )
    const [sendMeta, getMeta] = this.peerRoom.makeAction<FileTransferMeta>(
      PeerAction.FILE_TRANSFER_META,
      transferId
    )

    return new Promise(resolve => {
      let writer: WritableStreamDefaultWriter
      let receivedBytes = 0
      let totalBytes = 0

      getMeta((meta: FileTransferMeta) => {
        const file = meta.files[0]
        totalBytes = file.size
        const writable = streamSaver.createWriteStream(file.name, {
          size: file.size,
        })
        writer = writable.getWriter()
      })

      getChunk((chunk: DataPayload) => {
        if (chunk === null) {
          writer.close()
          this.emit('complete')
          resolve([])
          return
        }

        writer.write(chunk)
        receivedBytes += (chunk as Uint8Array).byteLength
        this.emit('progress', receivedBytes / totalBytes)
      })

      sendMeta({ transferId, files: [] }, offererId)
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
