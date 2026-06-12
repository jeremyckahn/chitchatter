import { test, expect } from '@playwright/test'

test.describe('Migration', () => {
  test('gracefully migrates legacy RSA-OAEP keys on boot and supports room communication', async ({
    browser,
  }) => {
    // 1. Create context 1 (Legacy User)
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    // We navigate to a blank page on the same origin so we can write to IndexedDB
    await page1.goto('/404-for-migration-setup', {
      waitUntil: 'domcontentloaded',
    })

    const legacyKeys = await page1.evaluate(async () => {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        },
        true,
        ['encrypt', 'decrypt']
      )
      const pubBuffer = await window.crypto.subtle.exportKey(
        'spki',
        keyPair.publicKey
      )
      const privBuffer = await window.crypto.subtle.exportKey(
        'pkcs8',
        keyPair.privateKey
      )

      const arrayBufferToBase64 = (buffer: ArrayBuffer) =>
        btoa(String.fromCharCode(...new Uint8Array(buffer)))
      return {
        publicKey: arrayBufferToBase64(pubBuffer),
        privateKey: arrayBufferToBase64(privBuffer),
      }
    })

    const legacyPublicKeyBase64 = legacyKeys.publicKey

    const legacyUserSettings = {
      version: 0,
      userId: 'legacy-user-uuid',
      customUsername: 'LegacyUser123',
      publicKey: legacyKeys.publicKey,
      privateKey: legacyKeys.privateKey,
      isEnhancedConnectivityEnabled: false,
      showActiveTypingStatus: true,
      selectedSound: '/sounds/knock.mp3',
      playSoundOnNewMessage: true,
      showNotificationOnNewMessage: false,
      hasDismissedDisclaimer: true,
      colorMode: 'dark',
    }

    // Write legacy settings using native IndexedDB API
    await page1.evaluate(async settings => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('chitchatter')
        request.onerror = () => reject(request.error)
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('keyvaluepairs')) {
            db.createObjectStore('keyvaluepairs')
          }
        }
        request.onsuccess = () => {
          const db = request.result
          try {
            const tx = db.transaction('keyvaluepairs', 'readwrite')
            const store = tx.objectStore('keyvaluepairs')
            const putRequest = store.put(settings, 'userSettings')
            putRequest.onsuccess = () => resolve()
            putRequest.onerror = () => reject(putRequest.error)
          } catch (e) {
            reject(e)
          }
        }
      })
    }, legacyUserSettings)

    // Now load the app for the legacy user
    await page1.goto('/')
    await page1.waitForLoadState('networkidle')

    // Assert seamless load: UI should render "Chitchatter" title
    await expect(page1).toHaveTitle(/Chitchatter/i)

    // Wait until the username is set
    const usernameDisplay = page1.getByText('LegacyUser123')
    await expect(usernameDisplay).toBeVisible()

    // Assert Settings navigation works and name is displayed
    await page1.goto('/settings')
    await page1.waitForLoadState('networkidle')

    const chatHeading = page1.getByRole('heading', {
      name: 'Chat',
      exact: true,
    })
    await expect(chatHeading).toBeVisible()

    // We should see LegacyUser123 in the settings
    const usernameText = page1.getByText(/LegacyUser123/)
    await expect(usernameText).toBeVisible()

    // Wait for the new key pair to be generated and stored
    await page1.waitForFunction(
      async legacyPubKey => {
        return new Promise<boolean>(resolve => {
          const request = indexedDB.open('chitchatter')
          request.onerror = () => resolve(false)
          request.onsuccess = () => {
            const db = request.result
            try {
              const tx = db.transaction('keyvaluepairs', 'readonly')
              const store = tx.objectStore('keyvaluepairs')
              const getRequest = store.get('userSettings')
              getRequest.onsuccess = () => {
                const settings = getRequest.result
                if (settings && settings.publicKey !== legacyPubKey) {
                  resolve(true)
                } else {
                  resolve(false)
                }
              }
              getRequest.onerror = () => resolve(false)
            } catch (_e) {
              resolve(false)
            }
          }
        })
      },
      legacyPublicKeyBase64,
      { timeout: 15000 }
    )

    // Join a public room with the migrated user
    await page1.goto('/')
    await page1.waitForLoadState('networkidle')

    const joinPublicRoomButton = page1.getByRole('button', {
      name: /join public room/i,
    })
    await joinPublicRoomButton.click()
    await page1.waitForURL(/\/public\/.+/)
    const roomUrl = page1.url()

    // 2. Create context 2 (Fresh User)
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    // Join the same room with the fresh user
    await page2.goto(roomUrl)
    await page2.waitForLoadState('networkidle')

    // Wait for both users to be connected
    await expect(page1.getByPlaceholder('Your message').first()).toBeVisible()
    await expect(page2.getByPlaceholder('Your message').first()).toBeVisible()

    // Wait for the peer join alert to verify connection is established
    await expect(
      page1.getByText(/someone has joined the room/i).first()
    ).toBeVisible({ timeout: 30000 })

    // Migrated user sends a message
    const chatInput1 = page1.getByPlaceholder('Your message').first()
    const message1 = 'Hello from migrated LegacyUser123!'
    await chatInput1.fill(message1)
    await chatInput1.press('Enter')

    // Migrated user should see their own message
    await expect(page1.getByText(message1)).toBeVisible()

    // Fresh user should see the message (meaning signature verification passed)
    await expect(page2.getByText(message1)).toBeVisible({ timeout: 30000 })

    // Fresh user sends a message
    const chatInput2 = page2.getByPlaceholder('Your message').first()
    const message2 = 'Hello back from modern user!'
    await chatInput2.fill(message2)
    await chatInput2.press('Enter')

    // Fresh user should see their own message
    await expect(page2.getByText(message2)).toBeVisible()

    // Migrated user should see the fresh user's message
    await expect(page1.getByText(message2)).toBeVisible({ timeout: 30000 })

    // Clean up
    await context1.close()
    await context2.close()
  })
})
