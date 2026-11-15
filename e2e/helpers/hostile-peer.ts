import { Browser, BrowserContext, JSHandle } from '@playwright/test'

import type { FileReference } from 'core/models/chat'

import type {
  downloadAsFreshClient as downloadAsFreshClientInBrowser,
  ForgedTranscriptEntry,
  HostilePeer,
  joinRoomAsHostilePeer,
} from './hostile-peer.browser'

export type { FileReference, ForgedTranscriptEntry }

type HostilePeerModule = {
  joinRoomAsHostilePeer: typeof joinRoomAsHostilePeer
  downloadAsFreshClient: typeof downloadAsFreshClientInBrowser
}

/**
 * Any same-origin page can import the app's source through Vite, so the hostile
 * peer runs on a blank one instead of booting a second copy of the app.
 */
const blankPagePath = '/e2e/helpers/hostile-peer.html'

const browserModulePath = '/e2e/helpers/hostile-peer.browser.ts'

const openBlankPage = async (context: BrowserContext) => {
  const page = await context.newPage()

  await page.goto(blankPagePath)

  return page
}

/**
 * A peer that is not running the Chitchatter UI, only its protocol.
 *
 * It exists to do what a modified client can: write a file offer for a magnet
 * URI that someone else offered, or hand a newcomer a transcript of its own
 * making. Everything is real: the browser, the WebRTC
 * connection, the tracker and the app's own transport.
 */
export interface HostilePeerSession {
  /** The file offers other peers have broadcast, with their keys. */
  getOfferedFiles: () => Promise<FileReference[]>
  /** The inline media other peers have posted, with their keys. */
  getInlineMediaFiles: () => Promise<FileReference[]>
  /** How many peers this one is currently connected to. */
  getPeerCount: () => Promise<number>
  /** Offers `file` as this peer's own, replaying its magnet URI and key. */
  claim: (file: FileReference, isAllInlineMedia?: boolean) => Promise<void>
  /**
   * Answers as the room's history, to the peers here now and to any that join:
   * the transcript a newcomer to a public room is backfilled with.
   */
  serveTranscript: (entries: ForgedTranscriptEntry[]) => Promise<void>
  /** Withdraws this peer's file offer. */
  withdraw: () => Promise<void>
  /** Leaves the room, as a peer that simply disconnects does. */
  leave: () => Promise<void>
  close: () => Promise<void>
}

export const joinAsHostilePeer = async (
  browser: Browser,
  roomId: string
): Promise<HostilePeerSession> => {
  const context = await browser.newContext()
  const page = await openBlankPage(context)

  const peer: JSHandle<HostilePeer> = await page.evaluateHandle(
    async ([modulePath, room]) => {
      // The URL is only known at run time, which is the point: the module is
      // the app's source, served by Vite to this page.
      const module: HostilePeerModule = await import(
        /* @vite-ignore */ new URL(modulePath, window.location.href).href
      )

      return module.joinRoomAsHostilePeer(room)
    },
    [browserModulePath, roomId]
  )

  return {
    getOfferedFiles: () => peer.evaluate(p => p.getOfferedFiles()),
    getInlineMediaFiles: () => peer.evaluate(p => p.getInlineMediaFiles()),
    getPeerCount: () => peer.evaluate(p => p.getPeerCount()),
    claim: (file, isAllInlineMedia = false) =>
      peer.evaluate((p, [claimed, isInline]) => p.claim(claimed, isInline), [
        file,
        isAllInlineMedia,
      ] as const),
    serveTranscript: entries =>
      peer.evaluate((p, forged) => p.serveTranscript(forged), entries),
    withdraw: () => peer.evaluate(p => p.withdraw()),
    leave: () => peer.evaluate(p => p.leave()),
    close: () => context.close(),
  }
}

/**
 * Downloads `file` as a client that was never in the room and returns its
 * decrypted text. Rejects if no seeder delivers it within `timeoutMs`, which is
 * what a destroyed torrent looks like from outside. The key comes from what a
 * peer in the room saw, since nothing outside the room can derive it.
 */
export const downloadFileAsLateJoiner = async (
  browser: Browser,
  file: FileReference,
  timeoutMs = 15_000
): Promise<string> => {
  const context = await browser.newContext()

  try {
    const page = await openBlankPage(context)

    const download = page.evaluate(
      async ([modulePath, wanted]) => {
        const module: HostilePeerModule = await import(
          /* @vite-ignore */ new URL(modulePath, window.location.href).href
        )

        return module.downloadAsFreshClient(wanted)
      },
      [browserModulePath, file] as const
    )

    let timer: ReturnType<typeof setTimeout> | undefined

    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `The file was not delivered within ${timeoutMs}ms: no peer is seeding it`
            )
          ),
        timeoutMs
      )
    })

    try {
      return await Promise.race([download, timeout])
    } finally {
      clearTimeout(timer)
    }
  } finally {
    await context.close()
  }
}
