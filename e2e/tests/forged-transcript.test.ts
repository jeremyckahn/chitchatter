import { BrowserContext, expect, test } from '@playwright/test'

import { joinAsHostilePeer } from '../helpers/hostile-peer'

/**
 * The first peer to answer a newcomer to a public room supplies the chat
 * history, and the newcomer has no way to check it. These tests run that for
 * real: the victim is the app in a real browser, the attacker is a second
 * browser that speaks the protocol over WebRTC and answers with a transcript of
 * its own making.
 *
 * What is being asked is not whether the history can be believed (it cannot,
 * messages are not signed) but what it can make the victim's browser *do*. An
 * inline-media entry is downloaded as soon as it is shown, and the string it
 * carries goes to WebTorrent, which fetches a URL it is given and follows the
 * `xs` and `ws` sources of a magnet. Before the transcript was validated, an
 * entry could therefore make every newcomer's browser send a request to a
 * server the attacker named.
 */

const connectionTimeout = 25_000

/**
 * The transcript is handled as soon as it arrives, and a download that was
 * going to start does so within moments. Waiting this long is what keeps the
 * check for a request from passing only because it looked too early.
 */
const settleMs = 3_000

const attackerHost = 'attacker.invalid'

const infoHash = '0123456789abcdef0123456789abcdef01234567'

const historyFromAStranger = 'History from a stranger is still shown'

/**
 * Each way a string handed to WebTorrent's `add` can send a request somewhere
 * the attacker chose, with the URL it would request, at a path of its own so a
 * request can be traced to the entry that caused it.
 *
 * Only what a browser can be seen to do is here. A magnet's `ws` (web seed) is
 * left to the unit tests of `isSafeMagnetUri`: WebTorrent contacts a web seed
 * only once it holds the torrent's metadata, which an invented info hash never
 * gets, so this test could not tell whether it was blocked.
 */
const unsafeMagnets = [
  {
    description: 'a bare URL',
    magnetURI: `http://${attackerHost}/direct.torrent`,
    requestedUrl: `http://${attackerHost}/direct.torrent`,
  },
  {
    description: 'a magnet naming a torrent file to fetch',
    magnetURI: `magnet:?xt=urn:btih:${infoHash}&xs=http://${attackerHost}/exact-source.torrent`,
    requestedUrl: `http://${attackerHost}/exact-source.torrent`,
  },
]

test.describe('A hostile first peer handing over the chat history', () => {
  test.describe.configure({ timeout: 90_000 })

  let context: BrowserContext | undefined
  let attacker: Awaited<ReturnType<typeof joinAsHostilePeer>> | undefined

  test.afterEach(async () => {
    await Promise.all([context?.close(), attacker?.close()])

    context = undefined
    attacker = undefined
  })

  test('cannot make a newcomer contact a server it names', async ({
    browser,
  }) => {
    const requestedUrls: string[] = []

    context = await browser.newContext()

    const victim = await context.newPage()

    victim.on('request', request => requestedUrls.push(request.url()))

    await victim.goto('/')
    await victim.getByRole('button', { name: /join public room/i }).click()
    await victim.waitForURL(/\/public\/.+/)

    const roomId = new URL(victim.url()).pathname.split('/').pop() ?? ''

    attacker = await joinAsHostilePeer(browser, roomId)

    await expect
      .poll(() => attacker?.getPeerCount(), { timeout: connectionTimeout })
      .toBe(1)

    const now = Date.now()

    await attacker.serveTranscript([
      {
        id: 'forged-text',
        authorId: 'someone-else',
        timeSent: now - 60_000,
        text: historyFromAStranger,
      },
      ...unsafeMagnets.map(({ magnetURI }, index) => ({
        id: `forged-media-${index}`,
        authorId: 'someone-else',
        timeSent: now - index,
        magnetURI,
      })),
    ])

    // The history is still backfilled: this is the product, and it is what
    // shows the transcript arrived and was handled before the check below
    await expect(victim.getByText(historyFromAStranger)).toBeVisible({
      timeout: connectionTimeout,
    })

    await victim.waitForTimeout(settleMs)

    for (const { description, requestedUrl } of unsafeMagnets) {
      // Soft, so that one that gets through does not hide the others
      expect
        .soft(
          requestedUrls.filter(url => url.startsWith(requestedUrl)),
          `${description} made the browser send a request`
        )
        .toEqual([])
    }
  })
})
