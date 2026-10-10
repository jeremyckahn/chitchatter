import {
  ClockAdapter,
  FileTransferAdapter,
  IdAdapter,
  LoggerAdapter,
  NotifierAdapter,
  PlatformAdapters,
  SoundAdapter,
  StorageAdapter,
} from 'core/adapters/types'

/**
 * Inert adapters, for tests and for hosts that genuinely lack the capability.
 *
 * The clock and id adapters are real rather than inert: a working clock and
 * unique ids are needed for the core to behave at all, and both are available
 * everywhere. Tests override them for determinism.
 */

export const noopNotifier: NotifierAdapter = { notify: () => {} }

export const noopSound: SoundAdapter = { playNewMessageSound: () => {} }

/** An in-memory StorageAdapter. Persists for the lifetime of the process only. */
export const createMemoryStorage = (): StorageAdapter => {
  const store = new Map<string, unknown>()

  return {
    getItem: async <T>(key: string) => (store.get(key) as T) ?? null,
    setItem: async <T>(key: string, value: T) => {
      store.set(key, value)

      return value
    },
    removeItem: async (key: string) => {
      store.delete(key)
    },
  }
}

/** Accepts offers and forgets them, so callers can run without a torrent stack. */
export const noopFileTransfer: FileTransferAdapter = {
  offer: async () => '',
  rescind: async () => {},
  rescindAll: async () => {},
  isOffering: () => false,
}

export const systemClock: ClockAdapter = { now: () => Date.now() }

export const silentLogger: LoggerAdapter = { warn: () => {}, error: () => {} }

export const createPlatformAdapters = (
  ids: IdAdapter,
  overrides: Partial<PlatformAdapters> = {}
): PlatformAdapters => ({
  notifier: noopNotifier,
  sound: noopSound,
  storage: createMemoryStorage(),
  fileTransfer: noopFileTransfer,
  clock: systemClock,
  ids,
  logger: silentLogger,
  ...overrides,
})
