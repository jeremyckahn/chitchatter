import type localforage from 'localforage'
import { v4 as uuid } from 'uuid'

import {
  FileTransferAdapter,
  IdAdapter,
  LoggerAdapter,
  NotifierAdapter,
  PlatformAdapters,
  SoundAdapter,
  StorageAdapter,
} from 'core/adapters/types'
import { FileHandle } from 'core/chat/fileOffers'
import { time } from 'core/lib/Time'
import { getSharedAudio } from 'lib/Audio'
import type { FileTransfer } from 'secure-file-transfer'

import { FileTransferService } from 'services/FileTransfer'
import { notification } from 'services/Notification'

/**
 * Browser implementations of the core's platform adapters.
 *
 * Each one is a thin wrapper around a service the app already had; the point of
 * the indirection is that `src/core` depends on the interface rather than on
 * the Web Audio, Notification, IndexedDB and WebTorrent APIs.
 */

export const webNotifier: NotifierAdapter = {
  notify: message => notification.showNotification(message),
}

/**
 * Plays the user's chosen notification sound through the Web Audio API.
 *
 * The underlying `Audio` is shared per sound rather than owned here: this is
 * built once per room, including the direct-message room each peer gets, and an
 * `AudioContext` apiece would exhaust the browser's cap.
 */
export const createWebSound = (audioDataUrl: string): SoundAdapter => ({
  playNewMessageSound: () => getSharedAudio(audioDataUrl).play(),
})

export const createWebStorage = (
  persistedStorage: typeof localforage
): StorageAdapter => ({
  getItem: <T>(key: string) => persistedStorage.getItem<T>(key),
  setItem: <T>(key: string, value: T) => persistedStorage.setItem(key, value),
  removeItem: (key: string) => persistedStorage.removeItem(key),
})

/**
 * The slice of {@link FileTransferService} the adapter uses. Narrow so a test
 * can supply a real, typed stand-in rather than a cast one.
 */
export interface FileTransferSource {
  fileTransfer: Pick<
    FileTransfer,
    'offer' | 'rescind' | 'rescindAll' | 'isOffering'
  >
}

interface SharedMagnetRecord {
  /** Torrents this client started with `offer`. */
  originated: Set<string>
  /** Magnets that are inline media in some room's transcript. */
  inlineMedia: Set<string>
}

const recordsBySource = new WeakMap<FileTransferSource, SharedMagnetRecord>()

/**
 * What this client knows about the torrents of a file transfer service.
 *
 * `createWebAdapters` runs once per room, but every room of a session shares
 * one service (and so one WebTorrent client). Keeping the record on the service
 * rather than in each adapter's closure is what lets a direct-message room see
 * the torrents the group room started, and the other way round.
 */
const getSharedMagnetRecord = (source: FileTransferSource) => {
  const existing = recordsBySource.get(source)

  if (existing) return existing

  const created: SharedMagnetRecord = {
    originated: new Set(),
    inlineMedia: new Set(),
  }

  recordsBySource.set(source, created)

  return created
}

/**
 * Encrypted file transfer over WebTorrent.
 *
 * The underlying library takes a `FileList`/`File[]`, which the core's
 * structural `FileHandle` is the minimal shape of — the web app always passes
 * real `File`s, so the cast is sound here and nowhere else.
 */
export const createWebFileTransfer = (
  fileTransferService: FileTransferSource
): FileTransferAdapter => {
  const { fileTransfer } = fileTransferService
  const { originated, inlineMedia } = getSharedMagnetRecord(fileTransferService)

  return {
    offer: async (files: readonly FileHandle[], roomId: string) => {
      const magnetURI = await fileTransfer.offer(
        files as unknown as File[],
        roomId
      )

      originated.add(magnetURI)

      return magnetURI
    },
    rescind: async (magnetURI: string) => {
      originated.delete(magnetURI)
      inlineMedia.delete(magnetURI)

      await fileTransfer.rescind(magnetURI)
    },
    rescindAll: async () => {
      originated.clear()
      inlineMedia.clear()

      await fileTransfer.rescindAll()
    },
    isOffering: (magnetURI: string) => fileTransfer.isOffering(magnetURI),
    isOriginated: (magnetURI: string) => originated.has(magnetURI),
    trackInlineMedia: (magnetURI: string) => {
      inlineMedia.add(magnetURI)
    },
    untrackInlineMedia: (magnetURI: string) => {
      inlineMedia.delete(magnetURI)
    },
    isInlineMedia: (magnetURI: string) => inlineMedia.has(magnetURI),
  }
}

export const webIds: IdAdapter = { uuid: () => uuid() }

export const consoleLogger: LoggerAdapter = {
  warn: (message, ...rest) => console.warn(message, ...rest),
  error: (message, ...rest) => console.error(message, ...rest),
}

export const createWebAdapters = ({
  selectedSound,
  fileTransferService,
  getUuid = uuid,
  persistedStorage,
  timeService = time,
}: {
  selectedSound: string
  fileTransferService: FileTransferService
  getUuid?: typeof uuid
  persistedStorage?: typeof localforage
  timeService?: typeof time
}): PlatformAdapters => ({
  notifier: webNotifier,
  sound: createWebSound(selectedSound),
  storage: persistedStorage
    ? createWebStorage(persistedStorage)
    : {
        getItem: async () => null,
        setItem: async <T>(_key: string, value: T) => value,
        removeItem: async () => {},
      },
  fileTransfer: createWebFileTransfer(fileTransferService),
  clock: { now: () => timeService.now() },
  ids: { uuid: () => getUuid() },
  logger: consoleLogger,
})
