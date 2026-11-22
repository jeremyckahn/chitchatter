import { Browser, BrowserContext, Page, expect, test } from '@playwright/test'

import { StreamType } from 'core/models/chat'

import {
  ForgedStreamMetadata,
  HostilePeerSession,
  joinAsHostilePeer,
} from '../helpers/hostile-peer'

/**
 * Audio from a peer the room does not list, run for real: the victim is the app
 * in a real browser, the attacker a browser that joins the room, never
 * announces itself, and plays a tone into it.
 *
 * A peer is listed, and so gets a row with a volume control, only once it
 * announces itself. Audio from any other peer would be a voice in the room that
 * the UI cannot name or turn down, so the app keeps it muted until its peer is
 * listed.
 *
 * Every page here runs under Chrome's real autoplay policy and is never
 * clicked, the strictest case: a room link opened straight from another app.
 * A peer whose audio is held muted and then released has to keep playing
 * under it, or ordinary calls would go silent whenever audio won the race
 * against the announcement.
 */

test.use({
  launchOptions: {
    args: [
      // Kept from the project's own launch options, which this replaces.
      '--disable-features=WebRtcHideLocalIpsWithMdns',
      // Chrome's default. Pinned, so that a laxer default in the test browser
      // cannot let audio play that a real user's browser would block.
      '--autoplay-policy=document-user-activation-required',
      // A real microphone for the real call below, granted without a prompt.
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
})

const connectionTimeout = 25_000

/** What the victim's page knows about one peer audio element. */
interface PeerAudioState {
  muted: boolean
  paused: boolean
  currentTime: number
  /** Whether media is arriving on the element's track: false until RTP does. */
  isReceiving: boolean
}

declare global {
  interface Window {
    peerAudioElements?: HTMLAudioElement[]
  }
}

/**
 * Peer audio elements are never put in the DOM, so they cannot be queried.
 * This records each one the app creates, before any of its code runs.
 */
const recordPeerAudioElements = () => {
  const NativeAudio = window.Audio
  const created: HTMLAudioElement[] = []

  window.peerAudioElements = created

  window.Audio = class extends NativeAudio {
    constructor(src?: string) {
      super(src)
      created.push(this)
    }
  }
}

const getPeerAudio = (page: Page): Promise<PeerAudioState[]> =>
  page.evaluate(() =>
    (window.peerAudioElements ?? []).map(audio => {
      const { srcObject } = audio
      const tracks =
        srcObject instanceof MediaStream ? srcObject.getAudioTracks() : []

      return {
        muted: audio.muted,
        paused: audio.paused,
        currentTime: audio.currentTime,
        isReceiving: tracks.some(
          track => track.readyState === 'live' && !track.muted
        ),
      }
    })
  )

/** The one peer audio element on `page`, once the app has created it. */
const waitForPeerAudio = async (page: Page): Promise<PeerAudioState> => {
  await expect
    .poll(async () => (await getPeerAudio(page)).length, {
      timeout: connectionTimeout,
    })
    .toBe(1)

  const [audio] = await getPeerAudio(page)

  if (!audio) throw new Error('The peer audio element disappeared')

  return audio
}

/** Whether the one peer audio element on `page` is audible and advancing. */
const expectAudible = async (page: Page) => {
  await expect
    .poll(async () => (await getPeerAudio(page))[0], {
      timeout: connectionTimeout,
    })
    .toMatchObject({ muted: false, paused: false, isReceiving: true })

  const before = (await getPeerAudio(page))[0]?.currentTime ?? 0

  // Playback that the autoplay policy blocked or paused does not advance.
  await expect
    .poll(async () => (await getPeerAudio(page))[0]?.currentTime ?? 0, {
      timeout: 5_000,
    })
    .toBeGreaterThan(before)
}

const openVictim = async (browser: Browser) => {
  const context = await browser.newContext({ permissions: ['microphone'] })

  await context.addInitScript(recordPeerAudioElements)

  return { context, page: await context.newPage() }
}

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

/** Joins the victim's room as an attacker and waits until they are connected. */
const joinAsAttacker = async (browser: Browser, roomId: string) => {
  const attacker = await joinAsHostilePeer(browser, roomId)

  await expect
    .poll(() => attacker.getPeerCount(), { timeout: connectionTimeout })
    .toBe(1)

  return attacker
}

test.describe('Audio from a peer the room does not list', () => {
  test.describe.configure({ timeout: 90_000 })

  let contexts: BrowserContext[] = []
  let attacker: HostilePeerSession | undefined

  test.afterEach(async () => {
    await Promise.all([
      ...contexts.map(context => context.close()),
      attacker?.close(),
    ])

    contexts = []
    attacker = undefined
  })

  const unlistedStreams: [string, ForgedStreamMetadata][] = [
    ['a microphone', { type: StreamType.MICROPHONE }],
    ['a screen share', { type: StreamType.SCREEN_SHARE }],
  ]

  unlistedStreams.forEach(([description, metadata]) => {
    test(`is muted when it claims to be ${description}`, async ({
      browser,
    }) => {
      const victim = await openVictim(browser)

      contexts.push(victim.context)

      const roomId = await joinPublicRoom(victim.page)

      attacker = await joinAsAttacker(browser, roomId)

      expect(await attacker.playTone(metadata)).toBe('running')

      // The tone reaches the victim's browser...
      await expect
        .poll(async () => (await getPeerAudio(victim.page))[0], {
          timeout: connectionTimeout,
        })
        .toMatchObject({ isReceiving: true })

      // ...and is held muted, from a peer the victim's UI does not show.
      expect(await waitForPeerAudio(victim.page)).toMatchObject({
        muted: true,
      })
      await expect(
        victim.page.getByText('Searching for peers...')
      ).toBeVisible()
    })
  })

  test('plays once its peer is listed, without a click, after arriving first', async ({
    browser,
  }) => {
    const victim = await openVictim(browser)

    contexts.push(victim.context)

    const roomId = await joinPublicRoom(victim.page)

    attacker = await joinAsAttacker(browser, roomId)

    await attacker.playTone({ type: StreamType.MICROPHONE })

    await expect
      .poll(async () => (await getPeerAudio(victim.page))[0], {
        timeout: connectionTimeout,
      })
      .toMatchObject({ muted: true, isReceiving: true })

    // Announcing itself is what any real client does on connecting.
    const { peerName } = await attacker.impersonate('late-announcer')

    await expect(
      victim.page.getByRole('listitem').filter({ hasText: peerName })
    ).toBeVisible({ timeout: connectionTimeout })

    await expectAudible(victim.page)
  })

  test('does not mute a real call between two listed peers', async ({
    browser,
  }) => {
    const alice = await openVictim(browser)
    const bob = await openVictim(browser)

    contexts.push(alice.context, bob.context)

    const roomId = await joinPublicRoom(alice.page)

    await joinPublicRoom(bob.page, roomId)

    await expect(bob.page.getByText('Searching for peers...')).toBeHidden({
      timeout: connectionTimeout,
    })

    await alice.page.getByRole('button', { name: 'call' }).click()

    await expectAudible(bob.page)
    await expect(bob.page.getByRole('slider').first()).toBeVisible()
  })
})
