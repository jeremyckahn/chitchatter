import { test, expect } from '@playwright/test'

test.describe('App Update Dialog', () => {
  test('should display update dialog and reload the page on refresh click', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for the app to load settings and render the main view
    const usernameText = page.getByText(/Your username:/)

    await expect(usernameText).toBeVisible({ timeout: 15000 })

    // Dialog should not be visible initially
    const updateDialogTitle = page.getByText('Update needed')
    const refreshButton = page.getByRole('button', { name: /refresh/i })

    await expect(updateDialogTitle).not.toBeVisible()
    await expect(refreshButton).not.toBeVisible()

    // Trigger update dialog via our exposed test helper
    await page.evaluate(() => {
      if (window.__triggerAppUpdateAvailable) {
        window.__triggerAppUpdateAvailable(true)
      }
    })

    // Dialog and refresh button should now be visible
    await expect(updateDialogTitle).toBeVisible()
    await expect(refreshButton).toBeVisible()

    // Set a window flag to detect if page reloads (the flag will be cleared on reload)
    await page.evaluate(() => {
      ;(window as any).__testReloadFlag = 'not-reloaded'
    })

    // Click the refresh button
    await refreshButton.click()

    // Verify that the page reloads (our custom reload flag is cleared)
    await expect(async () => {
      const reloadFlag = await page.evaluate(
        () => (window as any).__testReloadFlag
      )

      expect(reloadFlag).toBeUndefined()
    }).toPass()
  })
})
