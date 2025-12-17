import { test, expect } from '@playwright/test'
import { v4 as uuid } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDropAndDragTransfer } from '../helpers/test-helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('File Transfer (Trystero)', () => {
  test('should send and receive a file', async ({ browser }) => {
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    const roomId = uuid()

    await page1.goto(`/${roomId}`)
    await page2.goto(`/${roomId}`)

    await expect(page1.locator('text=You have joined the room')).toBeVisible()
    await expect(page2.locator('text=You have joined the room')).toBeVisible()

    const file = path.resolve(__dirname, '../fixtures/chitchatter.png')

    const dataTransfer = await getDropAndDragTransfer(page1, file)

    await page1.dispatchEvent('div[aria-label="File Upload"]', 'drop', {
      dataTransfer,
    })

    await expect(page1.locator('img[alt="chitchatter.png"]')).toBeVisible()
    await expect(page2.locator('img[alt="chitchatter.png"]')).toBeVisible()
  })
})
