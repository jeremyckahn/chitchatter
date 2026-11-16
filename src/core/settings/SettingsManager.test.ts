import { beforeAll, describe, expect, it } from 'vitest'

import { createMemoryStorage } from 'core/adapters/noop'
import { deriveUserIdFromKey } from 'core/chat/identity'
import { encryption } from 'core/crypto/Encryption'
import { ColorMode, UserSettings } from 'core/models/settings'
import { serialization } from 'core/settings/serialization'
import {
  SettingsManager,
  userSettingsStorageKey,
} from 'core/settings/SettingsManager'

let defaults: UserSettings

beforeAll(async () => {
  const { publicKey, privateKey } = await encryption.generateKeyPair()

  defaults = {
    userId: await deriveUserIdFromKey(encryption, publicKey),
    customUsername: '',
    colorMode: ColorMode.DARK,
    playSoundOnNewMessage: true,
    showNotificationOnNewMessage: true,
    showActiveTypingStatus: true,
    isEnhancedConnectivityEnabled: true,
    publicKey,
    privateKey,
    selectedSound: 'default',
  }
}, 30_000)

const createManager = () => {
  const storage = createMemoryStorage()

  return {
    storage,
    manager: new SettingsManager({
      storage,
      serializationService: serialization,
    }),
  }
}

describe('SettingsManager', () => {
  it('returns the defaults when nothing has been persisted', async () => {
    const { manager } = createManager()

    await expect(manager.load(defaults)).resolves.toMatchObject({
      userId: defaults.userId,
      colorMode: ColorMode.DARK,
      customUsername: '',
    })
  })

  it('round-trips settings through storage, CryptoKeys included', async () => {
    const { manager } = createManager()

    await manager.save({ ...defaults, customUsername: 'Ada' })

    const loaded = await manager.load(defaults)

    expect(loaded.customUsername).toBe('Ada')
    // The keys survive as usable CryptoKeys, not as the base64 they are stored as.
    expect(loaded.publicKey.type).toBe('public')
    expect(loaded.privateKey.type).toBe('private')
    await expect(encryption.stringifyCryptoKey(loaded.publicKey)).resolves.toBe(
      await encryption.stringifyCryptoKey(defaults.publicKey)
    )
  })

  it('stores settings in a serializable form', async () => {
    const { storage, manager } = createManager()

    await manager.save(defaults)

    const stored = await storage.getItem<Record<string, unknown>>(
      userSettingsStorageKey
    )

    // CryptoKeys cannot be structured-cloned, so they must be at rest as strings.
    expect(typeof stored?.['publicKey']).toBe('string')
    expect(typeof stored?.['privateKey']).toBe('string')
    expect(() => structuredClone(stored)).not.toThrow()
  })

  it('fills in a setting absent from older persisted data', async () => {
    const { storage, manager } = createManager()

    await manager.save({ ...defaults, colorMode: ColorMode.LIGHT })

    // Simulate data written before `showActiveTypingStatus` existed.
    const stored = await storage.getItem<Record<string, unknown>>(
      userSettingsStorageKey
    )

    delete stored?.['showActiveTypingStatus']
    await storage.setItem(userSettingsStorageKey, stored)

    const loaded = await manager.load(defaults)

    expect(loaded.showActiveTypingStatus).toBe(defaults.showActiveTypingStatus)
    // The settings that *were* persisted still win over the defaults.
    expect(loaded.colorMode).toBe(ColorMode.LIGHT)
  })

  it('merges a partial change over the current settings', async () => {
    const { manager } = createManager()

    const updated = await manager.update(defaults, {
      customUsername: 'Grace',
    })

    expect(updated.customUsername).toBe('Grace')
    expect(updated.userId).toBe(defaults.userId)
    await expect(manager.load(defaults)).resolves.toMatchObject({
      customUsername: 'Grace',
    })
  })

  it('migrates a stored random user id to the one derived from the key', async () => {
    const { storage, manager } = createManager()

    await manager.save(defaults)

    // What settings saved before ids were derived from keys look like.
    const stored = await storage.getItem<Record<string, unknown>>(
      userSettingsStorageKey
    )

    await storage.setItem(userSettingsStorageKey, {
      ...stored,
      userId: '3f8a2c1e-0b7d-4e59-9a16-5c2d8e7f4b01',
    })

    await expect(manager.load(defaults)).resolves.toMatchObject({
      userId: defaults.userId,
    })
  })

  it('cannot be made to keep a user id that does not belong to the key', async () => {
    const { manager } = createManager()

    const saved = await manager.update(defaults, { userId: 'chosen-by-hand' })

    expect(saved.userId).toBe('chosen-by-hand')
    // Corrected on the way back in, which every load and import goes through.
    await expect(manager.load(defaults)).resolves.toMatchObject({
      userId: defaults.userId,
    })
  })
})
