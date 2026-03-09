/**
 * P2P File Transfer Service using WebRTC data channels.
 *
 * Files are split into chunks (48KB each after Base64 = ~64KB),
 * sent via peer actions, and reassembled on the receiving end.
 */

const CHUNK_SIZE = 48 * 1024

export interface FileMetadata {
  id: string
  name: string
  type: string
  size: number
}

export interface FileChunk {
  transferId: string
  fileName: string
  fileType: string
  fileSize: number
  chunkIndex: number
  totalChunks: number
  data: string
}

export interface TransferredFile {
  metadata: FileMetadata
  blob: Blob
  url: string
}

const fileStore: Map<string, TransferredFile> = new Map()

const pendingChunks: Map<
  string,
  { metadata: FileMetadata; chunks: Map<number, string>; totalChunks: number }
> = new Map()

export const fileToChunks = async (
  file: File,
  transferId: string
): Promise<FileChunk[]> => {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const totalChunks = Math.max(1, Math.ceil(bytes.length / CHUNK_SIZE))
  const chunks: FileChunk[] = []

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, bytes.length)
    const slice = bytes.slice(start, end)
    const base64 = btoa(String.fromCharCode(...slice))

    chunks.push({
      transferId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      chunkIndex: i,
      totalChunks,
      data: base64,
    })
  }

  return chunks
}

export const fileTransferReceiveChunk = (
  chunk: FileChunk
): TransferredFile | null => {
  const key = `${chunk.transferId}:${chunk.fileName}`

  let pending = pendingChunks.get(key)
  if (!pending) {
    pending = {
      metadata: {
        id: chunk.transferId,
        name: chunk.fileName,
        type: chunk.fileType,
        size: chunk.fileSize,
      },
      chunks: new Map(),
      totalChunks: chunk.totalChunks,
    }
    pendingChunks.set(key, pending)
  }

  pending.chunks.set(chunk.chunkIndex, chunk.data)

  if (pending.chunks.size < pending.totalChunks) {
    return null
  }

  // All chunks received — reassemble
  const sortedData: string[] = []
  for (let i = 0; i < pending.totalChunks; i++) {
    sortedData.push(pending.chunks.get(i)!)
  }

  const fullBase64 = sortedData.join('')
  const binary = Uint8Array.from(atob(fullBase64), c => c.charCodeAt(0))
  const blob = new Blob([binary], { type: pending.metadata.type })
  const url = URL.createObjectURL(blob)

  const file: TransferredFile = { metadata: pending.metadata, blob, url }
  fileStore.set(key, file)
  pendingChunks.delete(key)

  return file
}

export const fileTransferOffer = async (files: File[]): Promise<string> => {
  const id = crypto.randomUUID()

  for (const file of files) {
    const buffer = await file.arrayBuffer()
    const blob = new Blob([buffer], { type: file.type })
    const url = URL.createObjectURL(blob)

    fileStore.set(`${id}:${file.name}`, {
      metadata: { id, name: file.name, type: file.type, size: file.size },
      blob,
      url,
    })
  }

  return id
}

export const fileTransferGetOffered = (offerId: string): TransferredFile[] => {
  const results: TransferredFile[] = []
  for (const [key, file] of fileStore) {
    if (key.startsWith(`${offerId}:`)) {
      results.push(file)
    }
  }
  return results
}

export const fileTransferRescind = (offerId: string) => {
  for (const [key, file] of fileStore) {
    if (key.startsWith(`${offerId}:`)) {
      URL.revokeObjectURL(file.url)
      fileStore.delete(key)
    }
  }
}

export const fileTransferRescindAll = () => {
  for (const [, file] of fileStore) {
    URL.revokeObjectURL(file.url)
  }
  fileStore.clear()
  pendingChunks.clear()
}

export const fileTransferIsOffering = (offerId: string): boolean => {
  for (const key of fileStore.keys()) {
    if (key.startsWith(`${offerId}:`)) return true
  }
  return false
}

export class FileTransferService {
  rescindAll = () => {
    fileTransferRescindAll()
  }

  isOffering = (offerId: string): boolean => {
    return fileTransferIsOffering(offerId)
  }

  rescind = (offerId: string) => {
    fileTransferRescind(offerId)
  }

  offer = async (
    files: FileList | File[],
    _roomId: string
  ): Promise<string> => {
    return fileTransferOffer(Array.from(files))
  }
}
