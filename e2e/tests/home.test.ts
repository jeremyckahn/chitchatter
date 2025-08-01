import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Check that the page title contains "Chitchatter"
    await expect(page).toHaveTitle(/Chitchatter/i)

    // Check that the main content loaded (verify logo area exists)
    const mainContent = page.locator('main, [role="main"], .Home')
    await expect(mainContent.first()).toBeVisible()

    // Check for username display
    const usernameText = page.getByText(/Your username:/)
    await expect(usernameText).toBeVisible()
  })

  test('should have join room buttons', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for the join public room button
    const joinPublicRoomButton = page.getByRole('button', {
      name: /join public room/i,
    })
    await expect(joinPublicRoomButton).toBeVisible()

    // Look for the join private room button
    const joinPrivateRoomButton = page.getByRole('button', {
      name: /join private room/i,
    })
    await expect(joinPrivateRoomButton).toBeVisible()

    // Look for the get embed code button
    const getEmbedCodeButton = page.getByRole('button', {
      name: /get embed code/i,
    })
    await expect(getEmbedCodeButton).toBeVisible()
  })

  test('should have a room name input', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for the room name input
    const roomNameInput = page.getByRole('textbox', { name: /room name/i })
    await expect(roomNameInput).toBeVisible()

    // Test typing into the input
    await roomNameInput.fill('test-room-name')
    await expect(roomNameInput).toHaveValue('test-room-name')
  })

  test('should navigate to a room when joining public room', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click the join public room button
    const joinPublicRoomButton = page.getByRole('button', {
      name: /join public room/i,
    })
    await joinPublicRoomButton.click()

    // Wait for navigation
    await page.waitForURL(/\/public\/.+/)

    // Verify we're on a public room page
    const url = page.url()
    expect(url).toContain('/public/')
  })

  test('should navigate to a room when joining private room', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click the join private room button
    const joinPrivateRoomButton = page.getByRole('button', {
      name: /join private room/i,
    })
    await joinPrivateRoomButton.click()

    // Wait for navigation
    await page.waitForURL(/\/private\/.+/)

    // Verify we're on a private room page
    const url = page.url()
    expect(url).toContain('/private/')
  })

  test('should have regenerate room name button', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for the regenerate button
    const regenerateButton = page.getByRole('button', {
      name: /regenerate room id/i,
    })
    await expect(regenerateButton).toBeVisible()

    // Get initial room name value
    const roomNameInput = page.getByRole('textbox', { name: /room name/i })
    const initialValue = await roomNameInput.inputValue()

    // Click regenerate and verify the value changes
    await regenerateButton.click()

    // Wait for the value to change by asserting the new value is not the initial one
    await expect(roomNameInput).not.toHaveValue(initialValue)
  })

  test('should have room name type toggle buttons', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for UUID toggle button
    const uuidButton = page.getByRole('button', { name: /uuid/i })
    await expect(uuidButton).toBeVisible()

    // Look for Passphrase toggle button
    const passphraseButton = page.getByRole('button', { name: /passphrase/i })
    await expect(passphraseButton).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that main elements are still visible and functional
    // Verify the page loads by checking for the page title
    await expect(page).toHaveTitle(/Chitchatter/i)

    const joinPublicRoomButton = page.getByRole('button', {
      name: /join public room/i,
    })
    await expect(joinPublicRoomButton).toBeVisible()

    const roomNameInput = page.getByRole('textbox', { name: /room name/i })
    await expect(roomNameInput).toBeVisible()
  })
})
