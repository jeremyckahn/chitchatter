import { Browser, BrowserContext, JSHandle } from '@playwright/test'

import type {
  downloadAsFreshClient as downloadAsFreshClientInBrowser,
  HostilePeer,
  joinRoomAsHostilePeer,
} from './hostile-peer.browser'

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
 * URI that someone else offered. Everything is real: the browser, the WebRTC
 * connection, the tracker and the app's own transport.
 */
export interface HostilePeerSession {
  /** Magnet URIs of the file offers other peers have broadcast. */
  getOfferedMagnetUris: () => Promise<string[]>
  /** Magnet URIs of the inline media other peers have posted. */
  getInlineMediaMagnetUris: () => Promise<string[]>
  /** How many peers this one is currently connected to. */
  getPeerCount: () => Promise<number>
  /** Offers `magnetURI` as this peer's own file. */
  claim: (magnetURI: string, isAllInlineMedia?: boolean) => Promise<void>
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
    getOfferedMagnetUris: () => peer.evaluate(p => p.getOfferedMagnetUris()),
    getInlineMediaMagnetUris: () =>
      peer.evaluate(p => p.getInlineMediaMagnetUris()),
    getPeerCount: () => peer.evaluate(p => p.getPeerCount()),
    claim: (magnetURI, isAllInlineMedia = false) =>
      peer.evaluate((p, [uri, isInline]) => p.claim(uri, isInline), [
        magnetURI,
        isAllInlineMedia,
      ] as const),
    withdraw: () => peer.evaluate(p => p.withdraw()),
    leave: () => peer.evaluate(p => p.leave()),
    close: () => context.close(),
  }
}

/**
 * Downloads the file behind `magnetURI` as a client that was never in the room
 * and returns its decrypted text. Rejects if no seeder delivers it within
 * `timeoutMs`, which is what a destroyed torrent looks like from outside.
 */
export const downloadFileAsLateJoiner = async (
  browser: Browser,
  magnetURI: string,
  roomId: string,
  timeoutMs = 15_000
): Promise<string> => {
  const context = await browser.newContext()

  try {
    const page = await openBlankPage(context)

    const download = page.evaluate(
      async ([modulePath, uri, room]) => {
        const module: HostilePeerModule = await import(
          /* @vite-ignore */ new URL(modulePath, window.location.href).href
        )

        return module.downloadAsFreshClient(uri, room)
      },
      [browserModulePath, magnetURI, roomId]
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
