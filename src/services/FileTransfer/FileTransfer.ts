/**
 * P2P File Transfer Service using WebRTC data channels.
 * Replaces the old WebTorrent-based implementation.
 *
 * Files are read as ArrayBuffer, converted to base64 chunks,
 * and sent via the existing PeerRoom action system.
 */

export interface FileMetadata {
  id: string
  name: string
  type: string
  size: number
}

export interface TransferredFile {
  metadata: FileMetadata
  blob: Blob
  url: string
}

const fileStore: Map<string, TransferredFile> = new Map()

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
}

export const fileTransferIsOffering = (offerId: string): boolean => {
  for (const key of fileStore.keys()) {
    if (key.startsWith(`${offerId}:`)) return true
  }
  return false
}

export const fileTransferReceive = (
  metadata: FileMetadata,
  data: string
): TransferredFile => {
  const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  const blob = new Blob([binary], { type: metadata.type })
  const url = URL.createObjectURL(blob)

  const file: TransferredFile = { metadata, blob, url }
  fileStore.set(`${metadata.id}:${metadata.name}`, file)
  return file
}

export const fileTransferGetFile = (
  offerId: string,
  fileName: string
): TransferredFile | undefined => {
  return fileStore.get(`${offerId}:${fileName}`)
}

export const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer()
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
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
