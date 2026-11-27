import { Browser, BrowserContext, expect, Page, test } from '@playwright/test'

import {
  downloadFileAsLateJoiner,
  FileReference,
  HostilePeerSession,
  joinAsHostilePeer,
} from '../helpers/hostile-peer'
import { itemAt } from '../../src/test-utils/itemAt'

/**
 * Regression tests for https://github.com/jeremyckahn/chitchatter/issues/680.
 *
 * The peer list is rendered by the shell, outside the room, and its download
 * button used to fall back to a page-lifetime WebTorrent client that the room
 * never saw. A file downloaded from it went on seeding after its owner withdrew
 * it and after the user left the room, until the tab closed.
 *
 * Whether anyone is still seeding is answered the way `file-offer-replay`
 * answers it: a fresh client tries to download the file. Alice stops seeding
 * her own copy in both tests, so the only one it could come from is Bob's.
 */

// StreamSaver registers a service worker (inside its mitm iframe) to deliver
// the download, so this suite needs them enabled.
test.use({ serviceWorkers: 'allow' })

const connectionTimeout = 25_000

/**
 * Rescinds are announced and acted on a few milliseconds after the click, and
 * nothing in the UI shows that a peer has stopped seeding. Waiting this long
 * keeps the fresh client from racing the teardown it is checking for.
 */
const teardownSettleMs = 2_000

/** How long the fresh client gets before the file counts as unavailable. */
const unavailableAfterMs = 6_000

const sharedText = 'contents only the room should keep seeding'

const verifiedPeerLabel =
  'This person has proven they hold the key behind the fingerprint shown. Names are not unique, so compare the fingerprint to be sure who this is.'

test.describe('A file downloaded from the peer list', () => {
  test.describe.configure({ timeout: 90_000 })

  let contexts: BrowserContext[] = []
  let observers: HostilePeerSession[] = []

  test.afterEach(async () => {
    await Promise.all([
      ...contexts.map(context => context.close()),
      ...observers.map(observer => observer.close()),
    ])

    contexts = []
    observers = []
  })

  const openPage = async (browser: Browser, url: string): Promise<Page> => {
    const context = await browser.newContext({ acceptDownloads: true })

    contexts.push(context)

    const page = await context.newPage()

    await page.goto(url)

    return page
  }

  /**
   * Alice shares a text file, and Bob downloads it from the peer list.
   *
   * The observer is a second browser speaking the protocol, which does nothing
   * but read the offer so the test knows the magnet URI and key a fresh client
   * would need. It never downloads, so it never seeds.
   */
  const shareAndDownloadFromPeerList = async (browser: Browser) => {
    const alice = await openPage(browser, '/')

    await alice.getByRole('button', { name: /join public room/i }).click()
    await alice.waitForURL(/\/public\/.+/)

    const roomUrl = alice.url()
    const roomId = new URL(roomUrl).pathname.split('/').pop() ?? ''
    const bob = await openPage(browser, roomUrl)

    for (const page of [alice, bob]) {
      await expect(
        page.locator(`[aria-label="${verifiedPeerLabel}"]`).first()
      ).toBeVisible({ timeout: connectionTimeout })
    }

    const observer = await joinAsHostilePeer(browser, roomId)

    observers.push(observer)

    await alice.locator('#file-upload').setInputFiles({
      name: 'secret.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(sharedText),
    })

    // The folder icon replaces the spinner once the offer is standing
    await expect(alice.getByTestId('FolderIcon')).toBeVisible()

    await expect
      .poll(() => observer.getOfferedFiles(), {
        message: 'The observer never saw Alice offer the file',
        timeout: connectionTimeout,
      })
      .toHaveLength(1)

    const file: FileReference = itemAt(await observer.getOfferedFiles(), 0)

    const downloadButton = bob.getByRole('button', {
      name: /download files being offered by/i,
    })

    await expect(downloadButton).toBeVisible({ timeout: connectionTimeout })

    const downloadEvent = bob.waitForEvent('download', { timeout: 20_000 })

    await downloadButton.click()

    const download = await downloadEvent
    const chunks: Buffer[] = []

    for await (const chunk of await download.createReadStream()) {
      chunks.push(Buffer.from(chunk))
    }

    expect(Buffer.concat(chunks).toString()).toBe(sharedText)

    return { alice, bob, downloadButton, file }
  }

  const stopSharing = (page: Page) => page.getByTestId('FolderIcon').click()

  test('stops being seeded once its owner withdraws it', async ({
    browser,
  }) => {
    const { alice, bob, downloadButton, file } =
      await shareAndDownloadFromPeerList(browser)

    await stopSharing(alice)

    await expect(downloadButton).toBeHidden({ timeout: connectionTimeout })
    await bob.waitForTimeout(teardownSettleMs)

    await expect(
      downloadFileAsLateJoiner(browser, file, unavailableAfterMs)
    ).rejects.toThrow(/no peer is seeding it/)
  })

  test('stops being seeded once the downloader leaves the room', async ({
    browser,
  }) => {
    const { alice, bob, file } = await shareAndDownloadFromPeerList(browser)

    // Leaves through the app rather than by reloading, which would end every
    // client the page holds and so prove nothing about the room's teardown.
    await bob.getByRole('link', { name: 'Home' }).click()
    await bob.waitForURL(url => new URL(url).pathname === '/')
    await bob.waitForTimeout(teardownSettleMs)

    // Bob has left, so he does not hear this; only his leaving can have
    // stopped his copy.
    await stopSharing(alice)
    await alice.waitForTimeout(teardownSettleMs)

    await expect(
      downloadFileAsLateJoiner(browser, file, unavailableAfterMs)
    ).rejects.toThrow(/no peer is seeding it/)
  })
})
