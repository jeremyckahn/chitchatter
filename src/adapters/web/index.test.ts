import { describe, expect, it, vi } from 'vitest'

import { createWebFileTransfer, FileTransferSource } from 'adapters/web'

const files = [{ name: 'doc.pdf', type: 'application/pdf', size: 10 }]

/**
 * A stand-in for the WebTorrent-backed library that behaves like it where the
 * adapter depends on it: `offer` and `download` both land in one torrent map,
 * and `rescind` removes from it.
 */
const createSource = () => {
  const torrents = new Set<string>()
  let offered = 0

  const source: FileTransferSource = {
    fileTransfer: {
      offer: vi.fn(async () => {
        const magnetURI = `magnet:offered-${++offered}`

        torrents.add(magnetURI)

        return magnetURI
      }),
      rescind: vi.fn((magnetURI: string) => {
        torrents.delete(magnetURI)
      }),
      rescindAll: vi.fn(() => {
        torrents.clear()
      }),
      isOffering: vi.fn((magnetURI: string) => torrents.has(magnetURI)),
    },
  }

  /** What the library does on `download`: seeds it without `offer`. */
  const download = (magnetURI: string) => {
    torrents.add(magnetURI)
  }

  return { source, download }
}

describe('createWebFileTransfer', () => {
  describe('isOriginated', () => {
    it('is true for a torrent started through offer', async () => {
      const { source } = createSource()
      const adapter = createWebFileTransfer(source)

      const magnetURI = await adapter.offer(files, 'room')

      expect(adapter.isOriginated(magnetURI)).toBe(true)
    })

    it('is false for a torrent the client only re-seeds after downloading it', () => {
      const { source, download } = createSource()
      const adapter = createWebFileTransfer(source)

      download('magnet:downloaded')

      expect(adapter.isOffering('magnet:downloaded')).toBe(true)
      expect(adapter.isOriginated('magnet:downloaded')).toBe(false)
    })

    it('is false for a magnet nobody offered', () => {
      const { source } = createSource()

      expect(createWebFileTransfer(source).isOriginated('magnet:x')).toBe(false)
    })

    it('does not record an offer that failed', async () => {
      const { source } = createSource()
      const adapter = createWebFileTransfer(source)

      vi.mocked(source.fileTransfer.offer).mockRejectedValueOnce(
        new Error('encryption failed')
      )

      await expect(adapter.offer(files, 'room')).rejects.toThrow(
        'encryption failed'
      )

      expect(adapter.isOriginated('magnet:offered-1')).toBe(false)
    })
  })

  describe('sharing between adapters on one service', () => {
    // `createWebAdapters` runs once per room but every room of a session shares
    // the one service, so the record has to follow the service, not the adapter:
    // a direct-message room must see what the group room started.
    it('lets one adapter see what another started', async () => {
      const { source } = createSource()
      const groupRoom = createWebFileTransfer(source)
      const directMessageRoom = createWebFileTransfer(source)

      const magnetURI = await groupRoom.offer(files, 'room')

      expect(directMessageRoom.isOriginated(magnetURI)).toBe(true)
    })

    it('keeps separate services separate', async () => {
      const first = createWebFileTransfer(createSource().source)
      const second = createWebFileTransfer(createSource().source)

      const magnetURI = await first.offer(files, 'room')

      expect(second.isOriginated(magnetURI)).toBe(false)
    })
  })

  describe('rescinding', () => {
    it('forgets a torrent once it is rescinded and passes the call through', async () => {
      const { source } = createSource()
      const adapter = createWebFileTransfer(source)

      const magnetURI = await adapter.offer(files, 'room')

      await adapter.rescind(magnetURI)

      expect(source.fileTransfer.rescind).toHaveBeenCalledWith(magnetURI)
      expect(adapter.isOriginated(magnetURI)).toBe(false)
      expect(adapter.isOffering(magnetURI)).toBe(false)
    })

    it('forgets every torrent on rescindAll', async () => {
      const { source } = createSource()
      const adapter = createWebFileTransfer(source)

      const first = await adapter.offer(files, 'room')
      const second = await adapter.offer(files, 'room')

      await adapter.rescindAll()

      expect(source.fileTransfer.rescindAll).toHaveBeenCalledTimes(1)
      expect(adapter.isOriginated(first)).toBe(false)
      expect(adapter.isOriginated(second)).toBe(false)
    })
  })
})
