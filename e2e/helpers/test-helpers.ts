import { Locator, Page, expect } from '@playwright/test'

/**
 * The message input of the room the page is showing.
 *
 * Once a peer connects, the app mounts a hidden direct-message dialog for it
 * (MUI `keepMounted`), and that dialog has its own "Your message" input. It is
 * portalled after the app root, so a plain `getByPlaceholder('Your message')`
 * matches two elements as soon as a peer is present, and whether it does yet
 * depends on connection timing (a Playwright strict mode violation). Role
 * queries skip `aria-hidden` subtrees, which is exactly what a closed dialog
 * is, so this resolves to a single input whether or not a peer has connected,
 * without relying on DOM order.
 */
export const getMessageInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Your message' })

/**
 * Helper function to send a message in a room
 */
export const sendMessage = async (
  page: Page,
  message: string
): Promise<void> => {
  const chatInput = getMessageInput(page)

  await chatInput.fill(message)
  await chatInput.press('Enter')
  await expect(page.getByText(message)).toBeVisible()
}
