import { expect, test } from '@playwright/test'

test.describe('Room Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and join a public room
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click join public room button
    const joinPublicRoomButton = page.getByRole('button', {
      name: /join public room/i,
    })
    await joinPublicRoomButton.click()

    // Wait for navigation to room
    await page.waitForURL(/\/public\/.+/)
  })

  test('should display room UI elements', async ({ page }) => {
    // Check for essential room UI elements
    const chatInput = page.getByPlaceholder('Your message')
    await expect(chatInput).toBeVisible()

    // Check for send button
    const sendButton = page.getByRole('button', { name: 'Send' })
    await expect(sendButton).toBeVisible()

    // Check for room info/header
    const roomHeader = page.locator('header, [data-testid="room-header"]')
    await expect(roomHeader.first()).toBeVisible()
  })

  test('should send and display messages', async ({ page }) => {
    // Type a message
    const chatInput = page.getByPlaceholder('Your message')
    const testMessage = 'Hello, this is a test message!'
    await chatInput.fill(testMessage)

    // Send the message
    const sendButton = page.getByRole('button', { name: 'Send' })
    await sendButton.click()

    // Input should be cleared after sending
    await expect(chatInput).toHaveValue('')

    // Verify message appears in chat
    const messageElement = page.getByText(testMessage)
    await expect(messageElement).toBeVisible()
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Your message')
    const testMessage = 'Testing keyboard shortcut'

    // Type message and press Enter to send
    await chatInput.fill(testMessage)
    await chatInput.press('Enter')

    // Verify message was sent
    await expect(page.getByText(testMessage)).toBeVisible()
    await expect(chatInput).toHaveValue('')
  })

  test('should copy room link', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-write', 'clipboard-read'])

    // Look for the copy URL button with Link icon
    const copyButton = page.getByRole('button', { name: 'Copy current URL' })
    await expect(copyButton).toBeVisible()

    // Get the current room URL before copying
    const currentUrl = page.url()

    // Click copy button
    await copyButton.click()

    // Check for success feedback (alert or snackbar)
    const successMessage = page
      .getByText(/copied/i)
      .or(page.getByText(/current url copied/i))
    await expect(successMessage.first()).toBeVisible({ timeout: 5000 })

    // Validate clipboard contents
    const clipboardText = await page.evaluate(async () => {
      return await navigator.clipboard.readText()
    })

    // The clipboard should contain the current room URL including the hash
    expect(clipboardText).toBe(currentUrl)
  })

  test('should handle empty message submission', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Your message')
    const sendButton = page.getByRole('button', { name: 'Send' })

    // Clear the input to make sure it's empty
    await chatInput.clear()

    // Send button should be disabled for empty messages
    await expect(sendButton).toBeDisabled()

    // Try typing spaces (should still be disabled)
    await chatInput.fill('   ')
    await expect(sendButton).toBeDisabled()
  })

  test('should persist messages during session', async ({ page }) => {
    // Send multiple messages
    const messages = ['First message', 'Second message', 'Third message']
    const chatInput = page.getByPlaceholder('Your message')
    const sendButton = page.getByRole('button', { name: 'Send' })

    for (const message of messages) {
      await chatInput.fill(message)
      await sendButton.click()
    }

    // All messages should remain visible
    for (const message of messages) {
      await expect(page.getByText(message)).toBeVisible()
    }
  })
})

test.describe('Multi-user Room Interaction', () => {
  test('should allow two users to chat', async ({ browser }) => {
    let context1
    let context2
    try {
      // Create first user context
      context1 = await browser.newContext()
      const page1 = await context1.newPage()

      // First user joins a public room
      await page1.goto('/')
      await page1.waitForLoadState('networkidle')

      const joinPublicRoomButton = page1.getByRole('button', {
        name: /join public room/i,
      })
      await joinPublicRoomButton.click()
      await page1.waitForURL(/\/public\/.+/)
      const roomUrl = page1.url()

      // Create second user context
      context2 = await browser.newContext()
      const page2 = await context2.newPage()

      // Second user joins the same room
      await page2.goto(roomUrl)
      await page2.waitForLoadState('networkidle')

      // Wait for both users to be connected
      await expect(page1.getByPlaceholder('Your message').first()).toBeVisible()
      await expect(page2.getByPlaceholder('Your message').first()).toBeVisible()

      // User 1 sends a message
      const chatInput1 = page1.getByPlaceholder('Your message').first()
      const message1 = 'Hello from User 1!'
      await chatInput1.fill(message1)
      await chatInput1.press('Enter')

      // User 1 should see their own message
      await expect(page1.getByText(message1)).toBeVisible()

      // Wait for P2P connection and message propagation
      await expect(page2.getByText(message1)).toBeVisible({ timeout: 25000 })

      // User 2 sends a message
      const chatInput2 = page2.getByPlaceholder('Your message').first()
      const message2 = 'Hello back from User 2!'
      await chatInput2.fill(message2)
      await chatInput2.press('Enter')

      // User 2 should see their own message
      await expect(page2.getByText(message2)).toBeVisible()
    } finally {
      // Clean up
      if (context1) {
        await context1.close()
      }
      if (context2) {
        await context2.close()
      }
    }
  })

  test('should verify peers successfully', async ({ browser }) => {
    let context1
    let context2
    try {
      // Create first user context
      context1 = await browser.newContext()
      const page1 = await context1.newPage()

      // First user joins a public room
      await page1.goto('/')
      await page1.waitForLoadState('networkidle')

      const joinPublicRoomButton = page1.getByRole('button', {
        name: /join public room/i,
      })
      await joinPublicRoomButton.click()
      await page1.waitForURL(/\/public\/.+/)
      const roomUrl = page1.url()

      // Create second user context
      context2 = await browser.newContext()
      const page2 = await context2.newPage()

      // Second user joins the same room
      await page2.goto(roomUrl)
      await page2.waitForLoadState('networkidle')

      // Wait for P2P connection
      await expect(page1.getByPlaceholder('Your message').first()).toBeVisible()
      await expect(page2.getByPlaceholder('Your message').first()).toBeVisible()

      // Verify both peers see each other as verified
      const verifiedTooltipText =
        'This person has been verified with public-key cryptography'

      const verifiedElement1 = page1.locator(
        `[aria-label="${verifiedTooltipText}"]`
      )
      await expect(verifiedElement1.first()).toBeVisible({ timeout: 25000 })

      const verifiedElement2 = page2.locator(
        `[aria-label="${verifiedTooltipText}"]`
      )
      await expect(verifiedElement2.first()).toBeVisible({ timeout: 25000 })
    } finally {
      // Clean up
      if (context1) {
        await context1.close()
      }
      if (context2) {
        await context2.close()
      }
    }
  })

  test('should fail peer verification when signature is invalid', async ({
    browser,
  }) => {
    let context1
    let context2
    try {
      // Create first user context
      context1 = await browser.newContext()
      const page1 = await context1.newPage()

      // Listen for the console warning on page1
      let hasVerificationFailedWarning = false
      page1.on('console', msg => {
        if (
          msg
            .text()
            .includes('Peer verification failed, marking peer as unverified')
        ) {
          hasVerificationFailedWarning = true
        }
      })

      // First user joins a public room
      await page1.goto('/')
      await page1.waitForLoadState('networkidle')

      const joinPublicRoomButton = page1.getByRole('button', {
        name: /join public room/i,
      })
      await joinPublicRoomButton.click()
      await page1.waitForURL(/\/public\/.+/)
      const roomUrl = page1.url()

      // Create second user context
      context2 = await browser.newContext()

      // Inject init script to mock signature failure
      await context2.addInitScript(() => {
        const originalSign = window.crypto.subtle.sign
        window.crypto.subtle.sign = async (algorithm, key, data) => {
          const algName =
            typeof algorithm === 'string' ? algorithm : algorithm.name
          if (algName === 'RSASSA-PKCS1-v1_5') {
            return new Uint8Array([1, 2, 3, 4]).buffer
          }
          return originalSign.call(window.crypto.subtle, algorithm, key, data)
        }
      })

      const page2 = await context2.newPage()

      // Second user joins the same room
      await page2.goto(roomUrl)
      await page2.waitForLoadState('networkidle')

      // Wait a moment for connection attempt
      await expect(page2.getByPlaceholder('Your message').first()).toBeVisible()

      // Verify page1 logs the verification failure warning
      await expect
        .poll(() => hasVerificationFailedWarning, {
          message: 'Expected console warning for peer verification failure',
          timeout: 25000,
        })
        .toBe(true)

      // Verify that page1 does NOT show any verified peer tooltips
      const verifiedTooltipText =
        'This person has been verified with public-key cryptography'
      const verifiedElement1 = page1.locator(
        `[aria-label="${verifiedTooltipText}"]`
      )
      await expect(verifiedElement1.first()).not.toBeVisible({ timeout: 5000 })

      // Verify that page1 shows the verification failure tooltip/icon instead
      const unverifiedTooltipText =
        'This person could not be verified with public-key cryptography. They may be misrepresenting themself. Be careful with what you share with them.'
      const unverifiedElement1 = page1.locator(
        `[aria-label="${unverifiedTooltipText}"]`
      )
      await expect(unverifiedElement1.first()).toBeVisible({ timeout: 25000 })
    } finally {
      // Clean up
      if (context1) {
        await context1.close()
      }
      if (context2) {
        await context2.close()
      }
    }
  })
})
