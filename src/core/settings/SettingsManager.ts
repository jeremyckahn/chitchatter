import { StorageAdapter } from 'core/adapters/types'
import { UserSettings } from 'core/models/settings'
import {
  SerializationService,
  SerializedUserSettings,
} from 'core/settings/serialization'

export const userSettingsStorageKey = 'userSettings'

/**
 * Loads, merges and persists user settings.
 *
 * Settings cannot be stored directly: they hold live `CryptoKey`s, which no
 * storage layer can serialize, hence the trip through
 * {@link SerializationService}.
 */
export class SettingsManager {
  private readonly storage: StorageAdapter

  private readonly serializationService: SerializationService

  private readonly storageKey: string

  constructor({
    storage,
    serializationService,
    storageKey = userSettingsStorageKey,
  }: {
    storage: StorageAdapter
    serializationService: SerializationService
    storageKey?: string
  }) {
    this.storage = storage
    this.serializationService = serializationService
    this.storageKey = storageKey
  }

  /**
   * Reads persisted settings, layered over `defaults`.
   *
   * Layering is the migration strategy: a setting added since the user last
   * saved is absent from storage and so takes its default, rather than arriving
   * as `undefined`.
   */
  load = async (defaults: UserSettings): Promise<UserSettings> => {
    const serializedDefaults =
      await this.serializationService.serializeUserSettings(defaults)
    const persisted = await this.storage.getItem<SerializedUserSettings>(
      this.storageKey
    )

    return this.serializationService.deserializeUserSettings({
      ...serializedDefaults,
      ...persisted,
    })
  }

  save = async (userSettings: UserSettings): Promise<UserSettings> => {
    await this.storage.setItem(
      this.storageKey,
      await this.serializationService.serializeUserSettings(userSettings)
    )

    return userSettings
  }

  update = async (
    userSettings: UserSettings,
    changes: Partial<UserSettings>
  ): Promise<UserSettings> => this.save({ ...userSettings, ...changes })
}
