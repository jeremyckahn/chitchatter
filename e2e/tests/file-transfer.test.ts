import { test } from '@playwright/test'
import { v4 as uuid } from 'uuid'

import { fileURLToPath } from 'url'
import path from 'path'

import { waitFor, getDropAndDragTransfer } from '../helpers/test-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('File Transfer', () => {
  test.skip('should be able to send and receive a file with direct networking', async ({
    browser,
  }) => {
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    const roomId = uuid()

    await page1.goto(`/${roomId}`)
    await page2.goto(`/${roomId}`)

    await page1.waitForSelector('text=You have joined the room')
    await page2.waitForSelector('text=You have joined the room')

    const file = path.resolve(__dirname, '../fixtures/chitchatter.png')

    const dataTransfer = await getDropAndDragTransfer(page1, file)

    await page1.dispatchEvent('div[aria-label="File Upload"]', 'drop', {
      dataTransfer,
    })

    await waitFor(() =>
      page1.locator('img[alt="chitchatter.png"]').isVisible()
    )
    await waitFor(() =>
      page2.locator('img[alt="chitchatter.png"]').isVisible()
    )

    await context1.close()
    await context2.close()
    await browser.close()
  })

  test('should be able to send and receive a file with legacy networking', async ({
    browser,
  }) => {
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    const roomId = uuid()

    await page1.goto(`/${roomId}`)
    await page2.goto(`/${roomId}`)

    await page1.waitForSelector('text=You have joined the room')
    await page2.waitForSelector('text=You have joined the room')

    const file = path.resolve(__dirname, '../fixtures/chitchatter.png')

    const dataTransfer = await getDropAndDragTransfer(page1, file)

    await page1.dispatchEvent('div[aria-label="File Upload"]', 'drop', {
      dataTransfer,
    })

    await waitFor(() =>
      page1.locator('img[alt="chitchatter.png"]').isVisible()
    )
    await waitFor(() =>
      page2.locator('img[alt="chitchatter.png"]').isVisible()
    )

    await context1.close()
    await context2.close()
    await browser.close()
  })
})
