import { FileHandle } from 'core/chat/fileOffers'

/**
 * How the core reaches the outside world.
 *
 * Everything the chat logic needs that is not pure computation arrives through
 * one of these. The web app satisfies them with the browser APIs it already
 * used (see src/adapters/web); a terminal or test host supplies its own, or the
 * inert versions in ./noop.
 */

/**
 * Out-of-band alerting — a desktop notification on the web, nothing in a TUI.
 *
 * Nothing in `src/core` calls this yet: the web app decides what to announce in
 * `useChatRoomNotifications`, off the room's events, because wording an alert
 * is presentation. The adapter stays because that decision is the host's, and
 * a host without a `useChatRoomNotifications` of its own needs somewhere to
 * put it — but do not assume the core routes notifications through it.
 */
export interface NotifierAdapter {
  notify: (message: string) => void
}

/** @see NotifierAdapter — the same applies: the host plays the sound today. */
export interface SoundAdapter {
  playNewMessageSound: () => void
}

/** Key/value persistence. IndexedDB on the web, a config file elsewhere. */
export interface StorageAdapter {
  getItem: <T>(key: string) => Promise<T | null>
  setItem: <T>(key: string, value: T) => Promise<T>
  removeItem: (key: string) => Promise<void>
}

/**
 * Encrypted file transfer. The web app backs this with WebTorrent via
 * secure-file-transfer; a host that cannot seed torrents supplies the no-op
 * version and simply never offers files.
 */
export interface FileTransferAdapter {
  /** Offers files to the room, resolving to the magnet URI that identifies them. */
  offer: (files: readonly FileHandle[], roomId: string) => Promise<string>
  rescind: (magnetURI: string) => Promise<void>
  rescindAll: () => Promise<void>
  isOffering: (magnetURI: string) => boolean
  /**
   * Whether this client started seeding `magnetURI` itself through `offer`, as
   * opposed to re-seeding it after downloading it from someone else.
   *
   * It is the adapter's to answer, not a room's, because the adapter is shared:
   * a group room and each direct-message room offer and rescind through the one
   * instance, so only it sees every torrent this client started. A peer's say-so
   * must never stop one of these.
   */
  isOriginated: (magnetURI: string) => boolean
  /**
   * Records that `magnetURI` is inline media in a room's transcript, and
   * {@link untrackInlineMedia} forgets it once it has left the transcript.
   *
   * Inline media is meant to outlive its sender: every peer that received it
   * keeps seeding it for as long as it is in the transcript. Each room only
   * sees its own transcript, but they share this adapter, so the record lives
   * here for a room to know that a magnet is inline media in a room it cannot
   * see. {@link rescind} and {@link rescindAll} forget it too.
   */
  trackInlineMedia: (magnetURI: string) => void
  untrackInlineMedia: (magnetURI: string) => void
  /** Whether any room's transcript refers to `magnetURI` as inline media. */
  isInlineMedia: (magnetURI: string) => boolean
}

/** Injectable so tests can control time instead of waiting for it. */
export interface ClockAdapter {
  now: () => number
}

export interface IdAdapter {
  uuid: () => string
}

export interface LoggerAdapter {
  warn: (message: string, ...rest: unknown[]) => void
  error: (message: string, ...rest: unknown[]) => void
}

export interface PlatformAdapters {
  notifier: NotifierAdapter
  sound: SoundAdapter
  storage: StorageAdapter
  fileTransfer: FileTransferAdapter
  clock: ClockAdapter
  ids: IdAdapter
  logger: LoggerAdapter
}
