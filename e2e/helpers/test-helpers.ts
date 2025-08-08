import { Page, expect } from '@playwright/test'

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
