import { Browser, BrowserContext, expect, Page, test } from '@playwright/test'

import {
  downloadFileAsLateJoiner,
  HostilePeerSession,
  joinAsHostilePeer,
} from '../helpers/hostile-peer'

/**
 * A magnet URI is a bearer identifier that is broadcast to the whole room, so
 * any peer can read one and write it back as an offer of its own. These tests
 * run that attack for real: the victims are the app in real browsers, the
 * attacker is a second browser speaking the protocol over WebRTC, and the
 * answer to "did it work?" comes from a fresh client trying to download.
 *
 * Before the fix, the attacker withdrawing (or leaving) made every holder of
 * the torrent destroy it, including the sharer, which deleted the data.
 */

const connectionTimeout = 25_000

/**
 * The attacker's messages are handled as they arrive, a few milliseconds after
 * they are sent, and nothing in the UI shows that they have been. Waiting this
 * long before checking the outcome is what keeps a late rescind from racing the
 * download it should have prevented.
 */
const attackSettleMs = 2_000

const sharedText = 'contents that must survive the attack'

// A 1x1 PNG
const pixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

const pixelAltText = 'pixel.png'

const verifiedPeerLabel =
  'This person has been verified with public-key cryptography'

test.describe("A peer replaying another peer's magnet URI", () => {
  test.describe.configure({ timeout: 90_000 })

  let contexts: BrowserContext[] = []
  let attackers: HostilePeerSession[] = []

  test.afterEach(async () => {
    await Promise.all([
      ...contexts.map(context => context.close()),
      ...attackers.map(attacker => attacker.close()),
    ])

    contexts = []
    attackers = []
  })

  const openPage = async (browser: Browser, url: string): Promise<Page> => {
    const context = await browser.newContext()

    contexts.push(context)

    const page = await context.newPage()

    await page.goto(url)

    return page
  }

  const createPublicRoom = async (browser: Browser) => {
    const page = await openPage(browser, '/')

    await page.getByRole('button', { name: /join public room/i }).click()
    await page.waitForURL(/\/public\/.+/)

    const roomId = new URL(page.url()).pathname.split('/').pop() ?? ''

    return { page, roomUrl: page.url(), roomId }
  }

  const joinAsAttacker = async (browser: Browser, roomId: string) => {
    const attacker = await joinAsHostilePeer(browser, roomId)

    attackers.push(attacker)

    return attacker
  }

  const upload = (
    page: Page,
    file: { name: string; mimeType: string; buffer: Buffer }
  ) => page.locator('#file-upload').setInputFiles(file)

  /**
   * Shares `file` and waits until the share is standing.
   *
   * What is waited on is the share control turning into its stop-sharing
   * state: the folder icon only replaces the spinner once encryption is done
   * and an offer is up. Not the "Encryption complete" toast, which announces
   * the same moment: the shell has one alert slot, so a peer's join landing
   * just after it (an attacker connecting, say) replaces it before it can be
   * seen, and the test fails with the share working fine.
   */
  const share = async (page: Page, file: Parameters<typeof upload>[1]) => {
    await upload(page, file)
    await expect(page.getByTestId('FolderIcon')).toBeVisible()
  }

  const shareText = (page: Page) =>
    share(page, {
      name: 'secret.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(sharedText),
    })

  const waitForSingleOffer = async (attacker: HostilePeerSession) => {
    await expect
      .poll(() => attacker.getOfferedFiles(), {
        message: 'The attacker never saw the sharer offer the file',
        timeout: connectionTimeout,
      })
      .toHaveLength(1)

    const [file] = await attacker.getOfferedFiles()

    return file
  }

  /**
   * Waits until each page shows a verified peer. A user alone in a room shows
   * none, and Mallory never introduces itself, so what is being waited for is
   * the real users finding each other. Something posted before they have would
   * reach only whoever is connected, and the test would then fail for a reason
   * that has nothing to do with the attack.
   */
  const waitUntilConnected = async (...pages: Page[]) => {
    for (const page of pages) {
      await expect(
        page.locator(`[aria-label="${verifiedPeerLabel}"]`).first()
      ).toBeVisible({ timeout: connectionTimeout })
    }
  }

  const settle = (page: Page) => page.waitForTimeout(attackSettleMs)

  test('leaves the file downloadable when nobody interferes', async ({
    browser,
  }) => {
    // The control for the tests below: it shows that a failure there is down to
    // the attack and not to the download not working in this environment.
    const { page: alice, roomId } = await createPublicRoom(browser)

    await shareText(alice)

    // Reads the magnet URI the way the attacker does, and then does nothing
    const bystander = await joinAsAttacker(browser, roomId)
    const file = await waitForSingleOffer(bystander)

    await settle(alice)

    await expect(downloadFileAsLateJoiner(browser, file)).resolves.toBe(
      sharedText
    )
  })

  test('cannot take a shared file away by claiming it and withdrawing', async ({
    browser,
  }) => {
    const { page: alice, roomId } = await createPublicRoom(browser)

    await shareText(alice)

    const mallory = await joinAsAttacker(browser, roomId)
    const file = await waitForSingleOffer(mallory)

    await mallory.claim(file)
    await mallory.withdraw()
    await settle(alice)

    await expect(downloadFileAsLateJoiner(browser, file)).resolves.toBe(
      sharedText
    )
  })

  test('cannot take a shared file away by claiming it and leaving', async ({
    browser,
  }) => {
    const { page: alice, roomId } = await createPublicRoom(browser)

    await shareText(alice)

    const mallory = await joinAsAttacker(browser, roomId)
    const file = await waitForSingleOffer(mallory)

    await mallory.claim(file)
    await mallory.leave()
    await settle(alice)

    await expect(downloadFileAsLateJoiner(browser, file)).resolves.toBe(
      sharedText
    )
  })

  test('cannot take inline media away from the room, whatever it claims about it', async ({
    browser,
  }) => {
    const { page: alice, roomUrl, roomId } = await createPublicRoom(browser)
    const bob = await openPage(browser, roomUrl)

    await waitUntilConnected(alice, bob)

    // Joined first, so that it is in the room to see the image being posted
    const mallory = await joinAsAttacker(browser, roomId)

    await expect
      .poll(() => mallory.getPeerCount(), { timeout: connectionTimeout })
      .toBe(2)

    await share(alice, {
      name: pixelAltText,
      mimeType: 'image/png',
      buffer: pixelPng,
    })

    // Bob has it, and so keeps seeding it for the room
    await expect(bob.getByAltText(pixelAltText)).toBeVisible({
      timeout: connectionTimeout,
    })

    await expect
      .poll(() => mallory.getInlineMediaFiles(), {
        message: 'The attacker never saw the image being posted',
        timeout: connectionTimeout,
      })
      .toHaveLength(1)

    const [image] = await mallory.getInlineMediaFiles()

    // The flag is the peer's own to set; a hostile one says it is not media
    await mallory.claim(image, false)
    await mallory.withdraw()
    await settle(alice)

    // Someone who arrives afterwards is backfilled the transcript and fetches
    // the image from whoever still holds it
    const carol = await openPage(browser, roomUrl)

    await expect(carol.getByAltText(pixelAltText)).toBeVisible({
      timeout: connectionTimeout,
    })
  })

  test('still lets the sharer withdraw their own offer', async ({
    browser,
  }) => {
    const { page: alice, roomUrl, roomId } = await createPublicRoom(browser)
    const bob = await openPage(browser, roomUrl)

    await waitUntilConnected(alice, bob)

    const mallory = await joinAsAttacker(browser, roomId)

    await shareText(alice)

    const downloadButton = bob.getByRole('button', {
      name: /download files being offered by/i,
    })

    await expect(downloadButton).toBeVisible({ timeout: connectionTimeout })

    const file = await waitForSingleOffer(mallory)

    // The button's label does not change with its state; its icon does
    await alice.getByTestId('FolderIcon').click()

    await expect(downloadButton).toBeHidden({ timeout: connectionTimeout })

    // Protecting the file from strangers must not stop its owner taking it back
    await expect(
      downloadFileAsLateJoiner(browser, file, 6_000)
    ).rejects.toThrow(/no peer is seeding it/)
  })
})
