import { BrowserContext, Page, expect, test } from '@playwright/test'

import { sendMessage } from '../helpers/test-helpers'

/**
 * index.html carries a Content Security Policy (added by
 * scripts/vite/contentSecurityPolicy.ts) whose script-src has no
 * 'unsafe-inline'. These tests check that it blocks `javascript:` URLs, the
 * sink a hostile StreamSaver frame used to run script in the app origin, and
 * that the app still works fully under it.
 */

// The download below goes through StreamSaver's service worker.
test.use({ serviceWorkers: 'allow' })

/**
 * Records every CSP violation the page reports, from the first script on.
 */
const recordCspViolations = async (page: Page): Promise<string[]> => {
  const violations: string[] = []

  await page.exposeFunction('__reportCspViolation', (violation: string) => {
    violations.push(violation)
  })
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      // Defined by exposeFunction above; not part of Window's type.
      const report: unknown = Reflect.get(window, '__reportCspViolation')

      if (typeof report === 'function') {
        report(`${event.effectiveDirective} blocked ${event.blockedURI}`)
      }
    })
  })

  return violations
}

test.describe('Content Security Policy', () => {
  test.setTimeout(90 * 1000)

  test('blocks javascript: URLs in iframes the app creates', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const result = await page.evaluate(
      () =>
        new Promise<{ ran: boolean; violatedDirective: string | null }>(
          resolve => {
            let violatedDirective: string | null = null
            let ran = false

            document.addEventListener('securitypolicyviolation', event => {
              violatedDirective = event.effectiveDirective
            })
            window.addEventListener('message', event => {
              if (event.data === 'csp-bypassed') ran = true
            })

            const iframe = document.createElement('iframe')

            iframe.hidden = true
            iframe.src =
              // eslint-disable-next-line no-script-url -- the attack payload under test; the policy must block it
              "javascript:void(parent.postMessage('csp-bypassed', '*'))"
            document.body.appendChild(iframe)

            setTimeout(() => resolve({ ran, violatedDirective }), 1000)
          }
        )
    )

    expect(result.ran).toBe(false)
    expect(result.violatedDirective).toMatch(/^script-src/)
  })

  test('lets peers chat and share a file without a single violation', async ({
    browser,
  }) => {
    let context1: BrowserContext | undefined
    let context2: BrowserContext | undefined

    try {
      context1 = await browser.newContext()
      const page1 = await context1.newPage()
      const violations1 = await recordCspViolations(page1)

      await page1.goto('/')
      await page1.waitForLoadState('networkidle')
      await page1.getByRole('button', { name: /join public room/i }).click()
      await page1.waitForURL(/\/public\/.+/)

      context2 = await browser.newContext({ acceptDownloads: true })
      const page2 = await context2.newPage()
      const violations2 = await recordCspViolations(page2)

      await page2.goto(page1.url())
      await page2.waitForLoadState('networkidle')

      const message = 'Hello under a Content Security Policy'

      await sendMessage(page1, message)
      await expect(page2.getByText(message)).toBeVisible({ timeout: 25000 })

      const fileContents = 'Saved through StreamSaver'

      await page1.locator('#file-upload').setInputFiles({
        name: 'csp.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContents),
      })

      const downloadButton = page2.getByRole('button', {
        name: /download files being offered/i,
      })

      await expect(downloadButton).toBeVisible({ timeout: 25000 })

      const downloadPromise = page2.waitForEvent('download', { timeout: 20000 })

      await downloadButton.click()
      const download = await downloadPromise
      const chunks: Buffer[] = []

      for await (const chunk of await download.createReadStream()) {
        chunks.push(Buffer.from(chunk))
      }

      expect(Buffer.concat(chunks).toString()).toBe(fileContents)
      expect(violations1).toEqual([])
      expect(violations2).toEqual([])
    } finally {
      await context1?.close()
      await context2?.close()
    }
  })
})
