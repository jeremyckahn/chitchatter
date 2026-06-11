import { test, expect } from '@playwright/test'

test.describe('Migration', () => {
  test('gracefully migrates legacy RSA-OAEP keys on boot', async ({ page }) => {
    // We navigate to a blank page on the same origin so we can write to localforage/IndexedDB
    await page.goto('/404-for-migration-setup', {
      waitUntil: 'domcontentloaded',
    })

    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
    })

    const legacyKeys = await page.evaluate(async () => {
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

    await page.evaluate(async settings => {
      // @ts-ignore
      localforage.config({
        name: 'chitchatter',
        description: 'Persisted settings data for chitchatter',
      })
      // @ts-ignore
      await localforage.setItem('userSettings', settings)
    }, legacyUserSettings)

    // Now load the app
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Assert seamless load: UI should render "Chitchatter" title
    await expect(page).toHaveTitle(/Chitchatter/i)

    // Wait until the username is set
    const usernameDisplay = page.getByText('LegacyUser123')
    await expect(usernameDisplay).toBeVisible()

    // Assert Settings navigation works and name is displayed
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const chatHeading = page.getByRole('heading', { name: 'Chat', exact: true })
    await expect(chatHeading).toBeVisible()

    // We should see LegacyUser123 in the settings
    const usernameText = page.getByText(/LegacyUser123/)
    await expect(usernameText).toBeVisible()

    // Navigate to localforage again via console evaluation
    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
    })

    // Wait for the new key pair to be generated and stored
    await page.waitForFunction(
      async legacyPubKey => {
        // @ts-ignore
        localforage.config({
          name: 'chitchatter',
          description: 'Persisted settings data for chitchatter',
        })
        // @ts-ignore
        const settings = await localforage.getItem('userSettings')

        if (!settings) return false

        const isLegacy = settings.publicKey === legacyPubKey

        if (!isLegacy) {
          return settings.publicKey // return the truthy new public key
        }

        return false
      },
      legacyPublicKeyBase64,
      { timeout: 15000 }
    )
  })
})
