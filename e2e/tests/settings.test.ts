import { test, expect } from '@playwright/test'

test.describe('Settings and Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => {
      localStorage.clear()
      sessionStorage.clear()

      // Clear IndexedDB
      const databases = await indexedDB.databases()
      await Promise.all(
        databases.map(db => {
          return new Promise<void>((resolve, reject) => {
            const deleteReq = indexedDB.deleteDatabase(db.name!)
            deleteReq.onsuccess = () => resolve()
            deleteReq.onerror = () => reject(deleteReq.error)
          })
        })
      )
    })
    await page.waitForLoadState('networkidle')
  })

  test('should open settings page via navigation', async ({ page }) => {
    // If menu button not visible, navigate directly as fallback
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/settings/)
    const chatHeading = page.getByRole('heading', {
      name: 'Chat',
      exact: true,
    })
    await expect(chatHeading).toBeVisible()
  })

  test('should show sound notifications section', async ({ page }) => {
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Should show sound notification text
    const soundText = page.getByText('Play a sound')
    await expect(soundText).toBeVisible()

    // Should show notification text
    const notificationText = page.getByText('Show a notification')
    await expect(notificationText).toBeVisible()
  })

  test('should show background message settings', async ({ page }) => {
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Should show the background message section
    const backgroundText = page.getByText(
      'When a message is received in the background:'
    )
    await expect(backgroundText).toBeVisible()
  })

  test('should show typing indicators setting', async ({ page }) => {
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

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
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

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
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Find import button
    const importButton = page.getByRole('button', {
      name: /import profile data/i,
    })
    await expect(importButton).toBeVisible()
  })

  test('should show delete data button and confirmation', async ({ page }) => {
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

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
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Should show current username in the delete section
    const userNameText = page.getByText(/your user name to change from/i)
    await expect(userNameText).toBeVisible()
  })

  test('should toggle theme from drawer', async ({ page }) => {
    // Find the theme toggle button in the list
    const themeButton = page.getByRole('button', { name: 'Change theme' })
    await expect(themeButton).toBeVisible()

    // Check current theme state and toggle
    const lightModeIcon = page.locator('svg[data-testid="Brightness7Icon"]')
    const darkModeIcon = page.locator('svg[data-testid="Brightness4Icon"]')

    await expect(lightModeIcon).toBeVisible()
    await expect(darkModeIcon).not.toBeVisible()

    // Click theme toggle
    await themeButton.click()

    // Verify theme changed
    await expect(lightModeIcon).not.toBeVisible()
    await expect(darkModeIcon).toBeVisible()
  })

  test('should display enhanced connectivity section when available', async ({
    page,
  }) => {
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Should have enhanced connectivity controls
    const enhancedConnectivityText = page.getByText('Enhanced connectivity')
    await expect(enhancedConnectivityText).toBeVisible()
  })

  test('should show sound selector section', async ({ page }) => {
    // Navigate directly to settings
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Should show sound selector text
    const soundSelectorText = page.getByText(/select a sound that plays/i)
    await expect(soundSelectorText).toBeVisible()
  })

  test('should open settings page and verify title', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/settings/)
    await expect(page).toHaveTitle(/Settings/)
  })
})
