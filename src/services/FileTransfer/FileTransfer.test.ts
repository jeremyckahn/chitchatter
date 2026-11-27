import { beforeEach, describe, expect, test, vi } from 'vitest'

import { itemAt } from 'test-utils/itemAt'

import { FileTransferService } from './FileTransfer'

const { clients, nextDestroyError } = vi.hoisted(() => ({
  clients: [] as { destroy: ReturnType<typeof vi.fn> }[],
  nextDestroyError: { current: null as Error | string | null },
}))

/**
 * Stands in for `secure-file-transfer`'s `FileTransfer`, keeping its WebTorrent
 * client under the same private name so the service reaches it the way it
 * reaches the real one.
 */
vi.mock('secure-file-transfer', () => ({
  FileTransfer: class {
    webTorrentClient = {
      destroy: vi.fn((callback: (error: Error | string | null) => void) => {
        callback(nextDestroyError.current)
      }),
    }

    destroy = vi.fn()

    constructor() {
      clients.push(this.webTorrentClient)
    }
  },
  setStreamSaverMitm: () => {},
}))

describe('FileTransferService', () => {
  beforeEach(() => {
    clients.length = 0
    nextDestroyError.current = null
  })

  test('rescinds its offers and destroys its WebTorrent client', async () => {
    const service = new FileTransferService({})

    await service.destroy()

    // The library's own `destroy()` only rescinds; the client is what holds
    // the tracker sockets open.
    expect(service.fileTransfer.destroy).toHaveBeenCalledTimes(1)
    expect(itemAt(clients, 0).destroy).toHaveBeenCalledTimes(1)
  })

  test('destroys the client only once however often it is called', async () => {
    const service = new FileTransferService({})

    // WebTorrent throws when a destroyed client is destroyed again.
    await Promise.all([service.destroy(), service.destroy()])
    await service.destroy()

    expect(itemAt(clients, 0).destroy).toHaveBeenCalledTimes(1)
  })

  test('rejects with an Error when the client fails to destroy', async () => {
    nextDestroyError.current = 'tracker would not close'

    const service = new FileTransferService({})

    await expect(service.destroy()).rejects.toThrow('tracker would not close')
  })

  test('rejects rather than leaking when the client is no longer reachable', async () => {
    const service = new FileTransferService({})

    // Stands in for a library update that renames its private field.
    Reflect.deleteProperty(service.fileTransfer, 'webTorrentClient')

    await expect(service.destroy()).rejects.toThrow(
      'no longer exposes a WebTorrent client'
    )
    expect(service.fileTransfer.destroy).toHaveBeenCalledTimes(1)
  })
})
