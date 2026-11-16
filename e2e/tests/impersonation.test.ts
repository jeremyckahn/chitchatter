import {
  Browser,
  BrowserContext,
  Locator,
  Page,
  expect,
  test,
} from '@playwright/test'

import { HostilePeerSession, joinAsHostilePeer } from '../helpers/hostile-peer'

/**
 * A peer claiming to be somebody else, run for real: the victims are the app
 * in real browsers, the impostor is a browser that speaks the protocol over
 * WebRTC and announces another user's identity.
 *
 * Two attacks, matching what an impostor can do:
 *
 * - With a key pair of its own, it names another user's id. The id is derived
 *   from the key, so the app lists it under its key's own id instead, flagged
 *   as unverified, and what it sends is attributed to that id.
 * - With an announcement it overheard, it re-sends the real user's id and key
 *   verbatim. It cannot answer the challenge that proves possession of the
 *   key, so it is never shown as verified.
 */

const connectionTimeout = 25_000

/**
 * Longer than the 15s a peer has to answer an identity challenge, with room
 * for the round trip, so that an unanswered one has timed out by then.
 */
const verificationTimeout = 25_000

const verifiedLabel =
  'This person has been verified with public-key cryptography'

const unverifiedLabel =
  'This person could not be verified with public-key cryptography. They may be misrepresenting themself. Be careful with what you share with them.'

const phishingMessage = 'Alice here. Send the wallet seed phrase to this room.'

const joinPublicRoom = async (page: Page, roomId?: string) => {
  if (roomId) {
    await page.goto(`/public/${roomId}`)
  } else {
    await page.goto('/')
    await page.getByRole('button', { name: /join public room/i }).click()
    await page.waitForURL(/\/public\/.+/)
  }

  return new URL(page.url()).pathname.split('/').pop() ?? ''
}

/** The rows of a page's peer list naming `peerName`. */
const peerRows = (page: Page, peerName: string): Locator =>
  page.getByRole('listitem').filter({ hasText: peerName })

const verificationBadge = (row: Locator, label: string): Locator =>
  row.locator(`[aria-label="${label}"]`)

const newPage = async (browser: Browser) => {
  const context = await browser.newContext()

  return { context, page: await context.newPage() }
}

test.describe('A peer impersonating another user', () => {
  test.describe.configure({ timeout: 90_000 })

  let contexts: BrowserContext[] = []
  let impostor: HostilePeerSession | undefined

  test.afterEach(async () => {
    await Promise.all([
      ...contexts.map(context => context.close()),
      impostor?.close(),
    ])

    contexts = []
    impostor = undefined
  })

  test('is listed under its own key’s name, unverified, and speaks as itself', async ({
    browser,
  }) => {
    const alice = await newPage(browser)
    const bob = await newPage(browser)

    contexts.push(alice.context, bob.context)

    const roomId = await joinPublicRoom(alice.page)

    impostor = await joinAsHostilePeer(browser, roomId)

    // Alice greets every peer that joins, the impostor included.
    await expect
      .poll(
        async () => (await impostor?.getOverheardIdentities())?.length ?? 0,
        { timeout: connectionTimeout }
      )
      .toBeGreaterThan(0)

    const [victim] = await impostor.getOverheardIdentities()

    await joinPublicRoom(bob.page, roomId)
    await expect
      .poll(() => impostor?.getPeerCount(), { timeout: connectionTimeout })
      .toBe(2)

    const own = await impostor.impersonate(victim.userId)

    // Bob sees the real Alice once, verified...
    const aliceRows = peerRows(bob.page, victim.peerName)

    await expect(
      verificationBadge(aliceRows, verifiedLabel).first()
    ).toBeAttached({ timeout: connectionTimeout })
    await expect(aliceRows).toHaveCount(1)

    // ...and the impostor under the name its own key derives, flagged.
    await expect(
      verificationBadge(peerRows(bob.page, own.peerName), unverifiedLabel)
    ).toBeAttached({ timeout: connectionTimeout })

    await impostor.sendMessage(phishingMessage, victim.userId)

    const message = bob.page
      .locator('.Message')
      .filter({ hasText: phishingMessage })

    await expect(message).toBeVisible({ timeout: connectionTimeout })
    await expect(message).toContainText(own.peerName)
    await expect(message).not.toContainText(victim.peerName)
  })

  test('cannot replay an overheard announcement to be verified as its owner', async ({
    browser,
  }) => {
    const alice = await newPage(browser)

    contexts.push(alice.context)

    const roomId = await joinPublicRoom(alice.page)

    impostor = await joinAsHostilePeer(browser, roomId)

    await expect
      .poll(
        async () => (await impostor?.getOverheardIdentities())?.length ?? 0,
        { timeout: connectionTimeout }
      )
      .toBeGreaterThan(0)

    const [victim] = await impostor.getOverheardIdentities()

    // The real Alice is gone before Bob arrives: nothing of hers is online.
    await alice.context.close()
    contexts = []

    const bob = await newPage(browser)

    contexts.push(bob.context)

    await joinPublicRoom(bob.page, roomId)
    await expect
      .poll(() => impostor?.getPeerCount(), { timeout: connectionTimeout })
      .toBe(1)

    await impostor.replayIdentity(victim.userId)

    const replayed = peerRows(bob.page, victim.peerName)

    await expect(replayed).toHaveCount(1, { timeout: connectionTimeout })

    // The replayed announcement names the right key, but only its owner can
    // answer the challenge for it, so the impostor never shows as verified.
    await expect(verificationBadge(replayed, unverifiedLabel)).toBeAttached({
      timeout: verificationTimeout,
    })
    await expect(verificationBadge(replayed, verifiedLabel)).toHaveCount(0)
  })
})
