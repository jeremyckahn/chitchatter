import { Readable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  blobUrlRevokeDelayMs,
  DownloadSaveStrategy,
  downloadAndSaveFiles,
  FileDownloader,
  getDownloadSaveStrategy,
  isFramed,
  SavableFile,
  saveBlob,
  savableFileToBlob,
  saveFilesInMemory,
} from './saveDownload'

const makeFile = (
  name: string,
  chunks: readonly (string | Buffer)[]
): SavableFile => ({
  name,
  createReadStream: () => Readable.from(chunks),
})

/** jsdom's Blob has no `text()`, but its FileReader works. */
const readBlob = (blob: Blob | undefined): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!blob) return reject(new Error('No blob'))
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

const unframed = { self: window, top: window }
const framed = { self: window, top: {} as Window } // only identity is compared

interface SavedFile {
  fileName: string
  href: string
}

/**
 * Records every `<a download>` click instead of letting jsdom try to follow
 * it.
 */
const captureSaves = () => {
  const saves: SavedFile[] = []
  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof HTMLAnchorElement)) return
    event.preventDefault()
    saves.push({ fileName: event.target.download, href: event.target.href })
  }

  document.addEventListener('click', onClick)

  return {
    saves,
    stop: () => document.removeEventListener('click', onClick),
  }
}

const blobsByUrl = new Map<string, Blob>()

beforeEach(() => {
  let nextId = 0

  blobsByUrl.clear()
  // jsdom implements neither, so stand in with a registry of blob: URLs.
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:http://localhost:3000/${nextId++}`

    blobsByUrl.set(url, blob)
    return url
  })
  URL.revokeObjectURL = vi.fn((url: string) => {
    blobsByUrl.delete(url)
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isFramed', () => {
  test('is false for a top-level document', () => {
    expect(isFramed(unframed)).toBe(false)
  })

  test('is true when the document has an ancestor', () => {
    expect(isFramed(framed)).toBe(true)
  })

  test('is true when reading top throws', () => {
    const throwing = {
      self: window,
      get top(): Window {
        throw new DOMException('Blocked', 'SecurityError')
      },
    }

    expect(isFramed(throwing)).toBe(true)
  })

  test('defaults to the current window', () => {
    expect(isFramed()).toBe(false)

    vi.spyOn(window, 'top', 'get').mockReturnValue(framed.top)

    expect(isFramed()).toBe(true)
  })
})

describe('getDownloadSaveStrategy', () => {
  test('streams when not framed', () => {
    expect(getDownloadSaveStrategy(unframed)).toBe(DownloadSaveStrategy.STREAM)
  })

  test('saves in memory when framed, so no mitm frame is exposed', () => {
    expect(getDownloadSaveStrategy(framed)).toBe(DownloadSaveStrategy.IN_MEMORY)
  })
})

describe('savableFileToBlob', () => {
  test('collects every chunk of the decrypted stream', async () => {
    const blob = await savableFileToBlob(
      makeFile('a.txt', [Buffer.from('Hello, '), 'wide ', Buffer.from('world')])
    )

    expect(await readBlob(blob)).toBe('Hello, wide world')
  })

  test('copies bytes out of pooled Buffers', async () => {
    const pool = Buffer.from('xxSECRETyy')
    const view = pool.subarray(2, 8)
    const blob = await savableFileToBlob(makeFile('a.txt', [view]))

    expect(await readBlob(blob)).toBe('SECRET')
  })

  test('rejects when the stream errors', async () => {
    const file: SavableFile = {
      name: 'broken.txt',
      createReadStream: () =>
        new Readable({
          read() {
            this.destroy(new Error('Decryption failed'))
          },
        }),
    }

    await expect(savableFileToBlob(file)).rejects.toThrow('Decryption failed')
  })
})

describe('saveBlob', () => {
  test('saves through a same-origin blob: URL and revokes it later', async () => {
    vi.useFakeTimers()
    const capture = captureSaves()
    const blob = new Blob(['contents'])

    saveBlob(blob, 'notes.txt')

    expect(capture.saves).toEqual([
      { fileName: 'notes.txt', href: 'blob:http://localhost:3000/0' },
    ])
    expect(document.querySelector('a')).toBeNull()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(blobUrlRevokeDelayMs)

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:http://localhost:3000/0'
    )
    capture.stop()
  })
})

describe('saveFilesInMemory', () => {
  test('saves each file under its own name', async () => {
    const capture = captureSaves()

    await saveFilesInMemory([
      makeFile('one.txt', ['first']),
      makeFile('two.txt', ['second']),
    ])

    expect(capture.saves.map(save => save.fileName)).toEqual([
      'one.txt',
      'two.txt',
    ])
    const contents = await Promise.all(
      capture.saves.map(save => readBlob(blobsByUrl.get(save.href)))
    )

    expect(contents).toEqual(['first', 'second'])
    capture.stop()
  })
})

describe('downloadAndSaveFiles', () => {
  const magnetURI = 'magnet:?xt=urn:btih:abc'
  const fileKey = 'file-key'

  const makeDownloader = (files: readonly SavableFile[] = []) => {
    const download = vi.fn<FileDownloader['download']>(async () => files)
    const fileTransfer: FileDownloader = { download }

    return { download, fileTransfer }
  }

  test('lets StreamSaver save the files when streaming', async () => {
    const { download, fileTransfer } = makeDownloader()
    const capture = captureSaves()
    const onProgress = vi.fn()

    await downloadAndSaveFiles({
      fileTransfer,
      magnetURI,
      fileKey,
      onProgress,
      strategy: DownloadSaveStrategy.STREAM,
    })

    expect(download).toHaveBeenCalledWith(magnetURI, fileKey, {
      doSave: true,
      onProgress,
    })
    expect(capture.saves).toEqual([])
    capture.stop()
  })

  test('keeps StreamSaver out and saves in memory when asked to', async () => {
    const { download, fileTransfer } = makeDownloader([
      makeFile('secret.txt', ['plaintext']),
    ])
    const capture = captureSaves()
    const onProgress = vi.fn()

    await downloadAndSaveFiles({
      fileTransfer,
      magnetURI,
      fileKey,
      onProgress,
      strategy: DownloadSaveStrategy.IN_MEMORY,
    })

    expect(download).toHaveBeenCalledWith(magnetURI, fileKey, {
      doSave: false,
      onProgress,
    })
    expect(capture.saves.map(save => save.fileName)).toEqual(['secret.txt'])
    expect(document.querySelector('iframe')).toBeNull()
    capture.stop()
  })

  test('defaults to streaming in a top-level document', async () => {
    const { download, fileTransfer } = makeDownloader()

    await downloadAndSaveFiles({ fileTransfer, magnetURI, fileKey })

    expect(download).toHaveBeenCalledWith(
      magnetURI,
      fileKey,
      expect.objectContaining({ doSave: true })
    )
  })

  test('defaults to saving in memory when framed', async () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue(framed.top)
    const { download, fileTransfer } = makeDownloader([
      makeFile('secret.txt', ['plaintext']),
    ])
    const capture = captureSaves()

    await downloadAndSaveFiles({ fileTransfer, magnetURI, fileKey })

    expect(download).toHaveBeenCalledWith(
      magnetURI,
      fileKey,
      expect.objectContaining({ doSave: false })
    )
    expect(capture.saves.map(save => save.fileName)).toEqual(['secret.txt'])
    capture.stop()
  })

  test('saves nothing when the download fails', async () => {
    const fileTransfer: FileDownloader = {
      download: async () => {
        throw new Error('Download aborted')
      },
    }
    const capture = captureSaves()

    await expect(
      downloadAndSaveFiles({
        fileTransfer,
        magnetURI,
        fileKey,
        strategy: DownloadSaveStrategy.IN_MEMORY,
      })
    ).rejects.toThrow('Download aborted')
    expect(capture.saves).toEqual([])
    capture.stop()
  })
})
