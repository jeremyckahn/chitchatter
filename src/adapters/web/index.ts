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
import { Audio } from 'lib/Audio'
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

/** Plays the user's chosen notification sound through the Web Audio API. */
export const createWebSound = (audioDataUrl: string): SoundAdapter => {
  const audio = new Audio(audioDataUrl)

  return { playNewMessageSound: () => audio.play() }
}

export const createWebStorage = (
  persistedStorage: typeof localforage
): StorageAdapter => ({
  getItem: <T>(key: string) => persistedStorage.getItem<T>(key),
  setItem: <T>(key: string, value: T) => persistedStorage.setItem(key, value),
  removeItem: (key: string) => persistedStorage.removeItem(key),
})

/**
 * Encrypted file transfer over WebTorrent.
 *
 * The underlying library takes a `FileList`/`File[]`, which the core's
 * structural `FileHandle` is the minimal shape of — the web app always passes
 * real `File`s, so the cast is sound here and nowhere else.
 */
export const createWebFileTransfer = (
  fileTransferService: FileTransferService
): FileTransferAdapter => {
  const { fileTransfer } = fileTransferService

  return {
    offer: (files: readonly FileHandle[], roomId: string) =>
      fileTransfer.offer(files as unknown as File[], roomId),
    rescind: async (magnetURI: string) => {
      await fileTransfer.rescind(magnetURI)
    },
    rescindAll: async () => {
      await fileTransfer.rescindAll()
    },
    isOffering: (magnetURI: string) => fileTransfer.isOffering(magnetURI),
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
