import { DownloadOpts, TorrentFile } from 'secure-file-transfer'

/**
 * How a downloaded, decrypted file reaches the user's disk.
 */
export enum DownloadSaveStrategy {
  /**
   * Stream through StreamSaver's cross-origin "mitm" iframe and service
   * worker. Handles files larger than memory, but hands the plaintext to a
   * frame that any ancestor of this document can navigate, so it is only safe
   * when this document has no ancestors.
   */
  STREAM = 'stream',
  /**
   * Collect the file into a `Blob` and save it through an `<a download>` of a
   * same-origin `blob:` URL. The plaintext never leaves this document.
   */
  IN_MEMORY = 'inMemory',
}

/**
 * Whether this document is displayed inside another one.
 *
 * This deliberately ignores the SDK's `?embed` query parameter: that is a UI
 * hint the embedding page chooses, while any page can frame Chitchatter
 * without setting it.
 */
export const isFramed = (
  win: Pick<Window, 'self' | 'top'> = window
): boolean => {
  try {
    return win.self !== win.top
  } catch {
    // Reading `top` can throw in some sandboxed cross-origin frames, which are
    // framed by definition.
    return true
  }
}

/**
 * Picks how to save a download. Any ancestor frame may navigate any of this
 * document's descendant frames, whatever their origin, and StreamSaver posts
 * the decrypted stream to its frame with targetOrigin `'*'`. A hostile
 * embedding page could therefore swap the frame for its own and read the
 * file, so a framed document never streams.
 */
export const getDownloadSaveStrategy = (
  win: Pick<Window, 'self' | 'top'> = window
): DownloadSaveStrategy =>
  isFramed(win) ? DownloadSaveStrategy.IN_MEMORY : DownloadSaveStrategy.STREAM

/**
 * The parts of a downloaded file that saving it in memory needs.
 */
export type SavableFile = Pick<TorrentFile, 'name' | 'createReadStream'>

/**
 * The slice of secure-file-transfer's `FileTransfer` that downloading uses.
 * `FileTransfer` satisfies it; tests supply a typed stand-in.
 */
export interface FileDownloader {
  download: (
    magnetURI: string,
    password: string,
    downloadOpts?: DownloadOpts
  ) => Promise<readonly SavableFile[]>
}

/**
 * Reads a downloaded file's decrypted contents into a `Blob`.
 */
export const savableFileToBlob = async (file: SavableFile): Promise<Blob> => {
  const parts: BlobPart[] = []

  for await (const chunk of file.createReadStream()) {
    // Copy into a fresh, ArrayBuffer-backed array: a Node Buffer may be a view
    // over a shared pool, and Blob wants its own bytes.
    parts.push(typeof chunk === 'string' ? chunk : new Uint8Array(chunk))
  }

  return new Blob(parts)
}

/**
 * How long a `blob:` URL stays valid after its download is triggered. The
 * browser reads it asynchronously, so revoking it right away can cancel the
 * download. This matches FileSaver.js.
 */
export const blobUrlRevokeDelayMs = 40_000

/**
 * Saves a `Blob` as a file through a same-origin `blob:` URL.
 */
export const saveBlob = (
  blob: Blob,
  fileName: string,
  doc: Document = document
): void => {
  const url = URL.createObjectURL(blob)
  const anchor = doc.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.hidden = true
  doc.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => URL.revokeObjectURL(url), blobUrlRevokeDelayMs)
}

/**
 * Saves downloaded files one at a time, so only one is held as a `Blob` at
 * once.
 */
export const saveFilesInMemory = async (
  files: readonly SavableFile[],
  doc: Document = document
): Promise<void> => {
  for (const file of files) {
    saveBlob(await savableFileToBlob(file), file.name, doc)
  }
}

export interface DownloadAndSaveOptions {
  fileTransfer: FileDownloader
  magnetURI: string
  fileKey: string
  onProgress?: (progress: number) => void
  strategy?: DownloadSaveStrategy
  doc?: Document
}

/**
 * Downloads and decrypts the files of a magnet URI, then saves them to disk
 * with a strategy that is safe for how this document is displayed.
 */
export const downloadAndSaveFiles = async ({
  fileTransfer,
  magnetURI,
  fileKey,
  onProgress,
  strategy = getDownloadSaveStrategy(),
  doc = document,
}: DownloadAndSaveOptions): Promise<void> => {
  switch (strategy) {
    case DownloadSaveStrategy.STREAM: {
      await fileTransfer.download(magnetURI, fileKey, {
        doSave: true,
        onProgress,
      })
      return
    }

    case DownloadSaveStrategy.IN_MEMORY: {
      const files = await fileTransfer.download(magnetURI, fileKey, {
        doSave: false,
        onProgress,
      })

      await saveFilesInMemory(files, doc)
      return
    }
  }
}
