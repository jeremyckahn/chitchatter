import { beforeAll, describe, expect, it } from 'vitest'

import { deriveUserIdFromKey } from 'core/chat/identity'
import { encryption } from 'core/crypto/Encryption'
import { ColorMode } from 'core/models/settings'

import { settings } from './Settings'

let publicKeyString: string
let privateKeyString: string
let derivedUserId: string

beforeAll(async () => {
  const { publicKey, privateKey } = await encryption.generateKeyPair()

  publicKeyString = await encryption.stringifyCryptoKey(publicKey)
  privateKeyString = await encryption.stringifyCryptoKey(privateKey)
  derivedUserId = await deriveUserIdFromKey(encryption, publicKey)
}, 30_000)

const profileFile = (overrides: Record<string, unknown> = {}) =>
  new File(
    [
      JSON.stringify({
        colorMode: ColorMode.LIGHT,
        userId: '3f8a2c1e-0b7d-4e59-9a16-5c2d8e7f4b01',
        customUsername: 'Ada',
        playSoundOnNewMessage: true,
        showNotificationOnNewMessage: false,
        showActiveTypingStatus: true,
        isEnhancedConnectivityEnabled: true,
        selectedSound: 'default',
        publicKey: publicKeyString,
        privateKey: privateKeyString,
        ...overrides,
      }),
    ],
    'chitchatter-profile.json'
  )

describe('SettingsService.importSettings', () => {
  it('imports a profile exported before ids were derived from keys', async () => {
    const imported = await settings.importSettings(profileFile())

    expect(imported).toMatchObject({
      customUsername: 'Ada',
      colorMode: ColorMode.LIGHT,
      // The random UUID in the file is replaced by the key's id.
      userId: derivedUserId,
    })
    await expect(
      encryption.stringifyCryptoKey(imported.publicKey)
    ).resolves.toBe(publicKeyString)
  })

  it('ignores a user id in the file that does not belong to its key', async () => {
    await expect(
      settings.importSettings(profileFile({ userId: 'chosen-by-hand' }))
    ).resolves.toMatchObject({ userId: derivedUserId })
  })

  it('rejects a file that is not a profile', async () => {
    await expect(
      settings.importSettings(new File(['{}'], 'not-a-profile.json'))
    ).rejects.toThrow()
  })
})
