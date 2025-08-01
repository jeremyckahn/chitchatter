import { test, expect } from '@playwright/test'

test.describe('Settings and Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should open settings page via navigation', async ({ page }) => {
    // Open the drawer menu
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()

    // Click on Settings link
    const settingsLink = page.getByRole('link', { name: 'Settings' })
    await expect(settingsLink).toBeVisible()
    await settingsLink.click()

    // Should navigate to settings page
    await page.waitForURL(/\/settings/)
    await expect(page).toHaveURL(/\/settings/)

    // Should show settings page content
    const chatHeading = page.getByRole('heading', { name: 'Chat', exact: true })
    await expect(chatHeading).toBeVisible()
  })

  test('should show sound notifications section', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Should show sound notification text
    const soundText = page.getByText('Play a sound')
    await expect(soundText).toBeVisible()

    // Should show notification text
    const notificationText = page.getByText('Show a notification')
    await expect(notificationText).toBeVisible()
  })

  test('should show background message settings', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Should show the background message section
    const backgroundText = page.getByText(
      'When a message is received in the background:'
    )
    await expect(backgroundText).toBeVisible()
  })

  test('should show typing indicators setting', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Should show typing indicators setting
    const typingText = page.getByText('Show active typing indicators')
    await expect(typingText).toBeVisible()

    // Should show the explanation text
    const explanationText = page.getByText(
      'Disabling this will also hide your active typing status from others.'
    )
    await expect(explanationText).toBeVisible()
  })

  test('should export profile data', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Find export button
    const exportButton = page.getByRole('button', {
      name: /export profile data/i,
    })
    await expect(exportButton).toBeVisible()

    // Set up download promise
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.json$/i)
  })

  test('should show import profile button', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Find import button
    const importButton = page.getByRole('button', {
      name: /import profile data/i,
    })
    await expect(importButton).toBeVisible()
  })

  test('should show delete data button and confirmation', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Find delete button
    const deleteButton = page.getByRole('button', {
      name: /delete all data and restart/i,
    })
    await expect(deleteButton).toBeVisible()

    // Click delete button
    await deleteButton.click()

    // Should show confirmation dialog
    const confirmDialog = page.getByRole('dialog')
    await expect(confirmDialog).toBeVisible()

    // Should have cancel and confirm buttons
    const cancelButton = page.getByRole('button', { name: /cancel/i })
    const confirmButton = page.getByRole('button', { name: /confirm/i })

    await expect(cancelButton).toBeVisible()
    await expect(confirmButton).toBeVisible()

    // Cancel the action
    await cancelButton.click()
    await expect(confirmDialog).not.toBeVisible()
  })

  test('should show user information', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Should show current username in the delete section
    const userNameText = page.getByText(/your user name to change from/i)
    await expect(userNameText).toBeVisible()
  })

  test('should toggle theme from drawer', async ({ page }) => {
    // Open the drawer menu
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()

    // Find the theme toggle button
    const themeButton = page.getByRole('button', { name: /change theme/i })
    await expect(themeButton).toBeVisible()

    // Assume dark mode is enabled by default - check for light mode icon
    await expect(
      page.locator('svg[data-testid="Brightness7Icon"]')
    ).toBeVisible()

    // Click theme toggle
    await themeButton.click()

    // Wait for theme change
    await page.waitForTimeout(500)

    // Verify theme changed to light mode (dark mode icon should now be visible)
    await expect(
      page.locator('svg[data-testid="Brightness4Icon"]')
    ).toBeVisible()
  })

  test('should display enhanced connectivity section', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Should show networking section (enhanced connectivity is available when VITE_RTC_CONFIG_ENDPOINT is set)
    const networkingHeading = page.getByRole('heading', { name: 'Networking' })
    await expect(networkingHeading).toBeVisible()

    // Should have enhanced connectivity controls
    const enhancedConnectivityText = page.getByText('Enhanced connectivity')
    await expect(enhancedConnectivityText).toBeVisible()
  })

  test('should show sound selector section', async ({ page }) => {
    // Navigate to settings
    const menuButton = page.getByRole('button', { name: /open menu/i })
    await menuButton.click()
    await page.getByRole('link', { name: 'Settings' }).click()
    await page.waitForURL(/\/settings/)

    // Should show sound selector text
    const soundSelectorText = page.getByText(/select a sound that plays/i)
    await expect(soundSelectorText).toBeVisible()
  })
})
