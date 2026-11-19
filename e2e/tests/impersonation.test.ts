import {
  Browser,
  BrowserContext,
  Locator,
  Page,
  expect,
  test,
} from '@playwright/test'

import { HostilePeerSession, joinAsHostilePeer } from '../helpers/hostile-peer'
import { sendMessage } from '../helpers/test-helpers'

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
 *
 * Either way, every message it sends is flagged in the transcript as coming
 * from a sender who could not be verified. That flag is what tells a replayer
 * apart from the real user, whose name it necessarily shares.
 *
 * It can also skip sending anything live and backfill a newcomer with a
 * history of its own making, naming whoever it likes as author. Nothing can
 * check those authors, so every backfilled message is flagged as relayed.
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
  'This person could not be verified with public-key cryptography. They may be misrepresenting themself. Be careful with what you share.'

const unverifiedAuthorLabel =
  'The sender of this message could not be verified with public-key cryptography. They may be misrepresenting themself. Be careful with what you share.'

const relayedMessageLabel =
  'This message was sent before you joined, and another peer relayed it to you. Its sender cannot be verified, so it may not be from who it says. Be careful with what you share.'

const phishingMessage = 'Alice here. Send the wallet seed phrase to this room.'

const genuineMessage = 'Hi Bob, it is really me.'

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

/** The transcript entry on a page that holds `text`. */
const transcriptMessage = (page: Page, text: string): Locator =>
  page.locator('.Message').filter({ hasText: text })

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

    const message = transcriptMessage(bob.page, phishingMessage)

    await expect(message).toBeVisible({ timeout: connectionTimeout })
    await expect(message).toContainText(own.peerName)
    await expect(message).not.toContainText(victim.peerName)
    await expect(
      verificationBadge(message, unverifiedAuthorLabel)
    ).toBeVisible()

    // What the real, verified Alice says carries no such flag.
    await sendMessage(alice.page, genuineMessage)

    const genuine = transcriptMessage(bob.page, genuineMessage)

    await expect(genuine).toBeVisible({ timeout: connectionTimeout })
    await expect(genuine).toContainText(victim.peerName)
    await expect(verificationBadge(genuine, unverifiedAuthorLabel)).toHaveCount(
      0
    )
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
    // Only the page is closed: that takes Alice out of the room just the same,
    // while closing the whole context mid-test makes Playwright export its trace
    // as the other contexts keep recording, which corrupts the trace in UI mode.
    await alice.page.close()

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

  test('has every message it sends with a replayed announcement flagged as unverified', async ({
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

    // Only the page is closed: that takes Alice out of the room just the same,
    // while closing the whole context mid-test makes Playwright export its trace
    // as the other contexts keep recording, which corrupts the trace in UI mode.
    await alice.page.close()

    const bob = await newPage(browser)

    contexts.push(bob.context)

    await joinPublicRoom(bob.page, roomId)
    await expect
      .poll(() => impostor?.getPeerCount(), { timeout: connectionTimeout })
      .toBe(1)

    await impostor.replayIdentity(victim.userId)
    await expect(peerRows(bob.page, victim.peerName)).toHaveCount(1, {
      timeout: connectionTimeout,
    })

    // Sent at once, while Bob is still waiting for an answer to his challenge.
    await impostor.sendMessage(phishingMessage, victim.userId)

    const message = transcriptMessage(bob.page, phishingMessage)

    await expect(message).toBeVisible({ timeout: connectionTimeout })

    // The replayed id is Alice's, so the message bears her name: only the flag
    // sets it apart from something she wrote.
    await expect(message).toContainText(victim.peerName)
    await expect(verificationBadge(message, unverifiedAuthorLabel)).toBeVisible(
      { timeout: verificationTimeout }
    )

    // And so does anything it sends after its challenge has gone unanswered.
    const followUp = 'Hurry, before the room closes.'

    await impostor.sendMessage(followUp, victim.userId)

    const later = transcriptMessage(bob.page, followUp)

    await expect(later).toBeVisible({ timeout: connectionTimeout })
    await expect(verificationBadge(later, unverifiedAuthorLabel)).toBeVisible()
  })

  test('cannot pass off a backfilled message as one from the user it replays', async ({
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

    await alice.page.close()

    // The report's scenario: the impostor wears Alice's announcement and is the
    // only peer Bob meets, so the history it hands him is all he gets. Part of
    // it it writes as Alice, the identity it is listed under, and part as
    // somebody else entirely.
    const somebodyElse = 'f'.repeat(64)
    const relayedMessage = 'Carol said the seed phrase is safe to share here.'

    await impostor.replayIdentity(victim.userId)
    await impostor.serveTranscript([
      {
        id: 'backfilled-phish',
        text: phishingMessage,
        timeSent: Date.now() - 60_000,
        timeReceived: Date.now() - 60_000,
        authorId: victim.userId,
      },
      {
        id: 'backfilled-hearsay',
        text: relayedMessage,
        timeSent: Date.now() - 30_000,
        timeReceived: Date.now() - 30_000,
        authorId: somebodyElse,
      },
    ])

    const bob = await newPage(browser)

    contexts.push(bob.context)

    await joinPublicRoom(bob.page, roomId)

    const message = transcriptMessage(bob.page, phishingMessage)

    await expect(message).toBeVisible({ timeout: connectionTimeout })

    // What it wrote as Alice is its own claim, judged like anything it sends
    // live: it names Alice, but is flagged once the replayer fails to prove
    // it is her.
    await expect(message).toContainText(victim.peerName)
    await expect(verificationBadge(message, unverifiedAuthorLabel)).toBeVisible(
      { timeout: verificationTimeout }
    )
    await expect(verificationBadge(message, relayedMessageLabel)).toHaveCount(0)

    // What it says somebody else wrote is only its account of them.
    const hearsay = transcriptMessage(bob.page, relayedMessage)

    await expect(verificationBadge(hearsay, relayedMessageLabel)).toBeVisible()
  })
})
