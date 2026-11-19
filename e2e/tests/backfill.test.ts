import { BrowserContext, Locator, Page, expect, test } from '@playwright/test'

import { sendMessage } from '../helpers/test-helpers'

/**
 * The history a newcomer to a public room is handed by a peer already there.
 *
 * The peer that hands it over is the authority on what it said itself, so its
 * own messages are judged like anything it sends live: no flag once it is
 * verified. What it says anyone else wrote is only its account of them, and is
 * flagged as relayed.
 */

const connectionTimeout = 25_000

const relayedMessageLabel =
  'This message was sent before you joined, and another peer relayed it to you. Its sender cannot be verified, so it may not be from who it says. Be careful with what you share.'

const unverifiedAuthorLabel =
  'The sender of this message could not be verified with public-key cryptography. They may be misrepresenting themself. Be careful with what you share.'

const verifiedLabel =
  'This person has been verified with public-key cryptography'

const transcriptMessage = (page: Page, text: string): Locator =>
  page.locator('.Message').filter({ hasText: text })

const badges = (page: Page, label: string): Locator =>
  page.locator('.Message').locator(`[aria-label="${label}"]`)

const verifiedPeers = (page: Page): Locator =>
  page
    .getByRole('listitem')
    .filter({ has: page.locator(`[aria-label="${verifiedLabel}"]`) })

test.describe('Backfilled history', () => {
  test.describe.configure({ timeout: 90_000 })

  let contexts: BrowserContext[] = []

  test.afterEach(async () => {
    await Promise.all(contexts.map(context => context.close()))
    contexts = []
  })

  test('flags only what the peer that sent it says others wrote', async ({
    browser,
  }) => {
    const pages: Page[] = []

    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext()

      contexts.push(context)
      pages.push(await context.newPage())
    }

    const [alice, carol, bob] = pages

    await alice.goto('/')
    await alice.getByRole('button', { name: /join public room/i }).click()
    await alice.waitForURL(/\/public\/.+/)

    const roomUrl = new URL(alice.url()).pathname

    await carol.goto(roomUrl)
    await expect(verifiedPeers(alice)).toHaveCount(1, {
      timeout: connectionTimeout,
    })

    const fromAlice = 'Morning! Did the build go out?'
    const fromCarol = 'Yes, shipped an hour ago.'

    await sendMessage(alice, fromAlice)
    await sendMessage(carol, fromCarol)
    await expect(alice.getByText(fromCarol)).toBeVisible({
      timeout: connectionTimeout,
    })

    await bob.goto(roomUrl)
    await expect(transcriptMessage(bob, fromAlice)).toBeVisible({
      timeout: connectionTimeout,
    })
    await expect(transcriptMessage(bob, fromCarol)).toBeVisible()
    await expect(verifiedPeers(bob)).toHaveCount(2, {
      timeout: connectionTimeout,
    })

    // Bob's history came from Alice or Carol, whichever answered first: that
    // peer's own message carries no flag, and the other's is relayed.
    await expect(badges(bob, relayedMessageLabel)).toHaveCount(1)
    await expect(badges(bob, unverifiedAuthorLabel)).toHaveCount(0)

    // Messages sent live once Bob is here carry no flag at all.
    const welcome = 'Welcome, Bob!'

    await sendMessage(alice, welcome)
    await expect(transcriptMessage(bob, welcome)).toBeVisible({
      timeout: connectionTimeout,
    })
    await expect(badges(bob, relayedMessageLabel)).toHaveCount(1)
  })
})
