import { Page, expect } from '@playwright/test'

/**
 * Helper function to create a new room and return its URL
 */
export const createRoom = async (page: Page): Promise<string> => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const joinPublicRoomButton = page.getByRole('button', {
    name: /join public room/i,
  })
  await joinPublicRoomButton.click()
  await page.waitForURL(/\/public\/.+/)

  return page.url()
}

/**
 * Helper function to join a room by URL
 */
export const joinRoom = async (page: Page, roomUrl: string): Promise<void> => {
  await page.goto(roomUrl)
  await page.waitForLoadState('networkidle')
}

/**
 * Helper function to send a message in a room
 */
export const sendMessage = async (
  page: Page,
  message: string
): Promise<void> => {
  const chatInput = page.getByPlaceholder('Your message')
  await chatInput.fill(message)
  await chatInput.press('Enter')
  await expect(page.getByText(message)).toBeVisible()
}

/**
 * Helper function to wait for a specific number of peers
 */
export const waitForPeerCount = async (
  page: Page,
  expectedCount: number
): Promise<void> => {
  const peerItems = page.locator(
    '[data-testid="peer-item"], [aria-label*="user-item"]'
  )

  await expect(peerItems).toHaveCount(expectedCount, { timeout: 15000 })
}

/**
 * Helper function to grant necessary permissions
 */
export const grantPermissions = async (
  page: Page,
  permissions: string[]
): Promise<void> => {
  await page.context().grantPermissions(permissions)
}
