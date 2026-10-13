import { beforeAll, describe, expect, it } from 'vitest'

import { createMemoryStorage } from 'core/adapters/noop'
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
    userId: 'user-1',
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
      userId: 'user-1',
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
    expect(typeof stored?.publicKey).toBe('string')
    expect(typeof stored?.privateKey).toBe('string')
    expect(() => structuredClone(stored)).not.toThrow()
  })

  it('fills in a setting absent from older persisted data', async () => {
    const { storage, manager } = createManager()

    await manager.save({ ...defaults, colorMode: ColorMode.LIGHT })

    // Simulate data written before `showActiveTypingStatus` existed.
    const stored = await storage.getItem<Record<string, unknown>>(
      userSettingsStorageKey
    )

    delete stored?.showActiveTypingStatus
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
})
