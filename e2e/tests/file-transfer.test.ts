import { Browser, BrowserContext, expect, test } from '@playwright/test'

// StreamSaver registers a service worker (inside its mitm iframe) to deliver
// the download, so unlike the rest of the suite this one needs them enabled.
test.use({ serviceWorkers: 'allow' })

const offerFileAndDownloadIt = async (browser: Browser) => {
  let context1: BrowserContext | undefined
  let context2: BrowserContext | undefined

  try {
    context1 = await browser.newContext()
    const page1 = await context1.newPage()

    await page1.goto('/')
    await page1.waitForLoadState('networkidle')
    await page1.getByRole('button', { name: /join public room/i }).click()
    await page1.waitForURL(/\/public\/.+/)
    const roomUrl = page1.url()

    context2 = await browser.newContext({ acceptDownloads: true })
    const page2 = await context2.newPage()

    await page2.goto(roomUrl)
    await page2.waitForLoadState('networkidle')

    // Wait until the peers are connected to one another
    const message = 'Hello before the file'

    await page1.getByPlaceholder('Your message').fill(message)
    await page1.getByPlaceholder('Your message').press('Enter')
    await expect(page2.getByText(message)).toBeVisible({ timeout: 25000 })

    const fileName = 'greeting.txt'
    const fileContents = 'Hello from a file offered over WebRTC!'

    await page1.locator('#file-upload').setInputFiles({
      name: fileName,
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

    expect(download.suggestedFilename()).toBe(fileName)

    const chunks: Buffer[] = []

    for await (const chunk of await download.createReadStream()) {
      chunks.push(Buffer.from(chunk))
    }

    expect(Buffer.concat(chunks).toString()).toBe(fileContents)
  } finally {
    await context1?.close()
    await context2?.close()
  }
}

test.describe('File transfer', () => {
  test.setTimeout(90 * 1000)

  test('lets a peer download a file another peer offered', async ({
    browser,
  }) => {
    await offerFileAndDownloadIt(browser)
  })
})
