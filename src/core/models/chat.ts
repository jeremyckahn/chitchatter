/**
 * The wire and transcript shapes for chat content.
 *
 * These are `type` aliases rather than interfaces on purpose. A `type` gets an
 * implicit index signature, so it satisfies Trystero's `DataPayload`
 * constraint without declaring `extends Record<string, any>` — which would
 * make `keyof` equal `string | number` and so make `Omit`/`Pick` over these
 * shapes silently erase every named field. See AGENTS.md.
 */
export type UnsentMessage = {
  id: string
  text: string
  timeSent: number
  authorId: string
}

/**
 * What this client knows about who wrote a received entry. Local to this
 * client: it is never sent to a peer, and a transcript entry a peer hands over
 * cannot set it.
 *
 * An entry either came live from its sender, whose identity check this client
 * ran, or was relayed in a transcript by some other peer, with no sender to
 * check at all. So at most one of these is ever set.
 */
export type AuthorVerification = {
  /**
   * The verification state of the peer that sent the message, as it stood
   * once that peer's identity check settled. VERIFYING while the check is
   * still running.
   *
   * Absent on this client's own messages and on relayed entries.
   */
  authorVerificationState?: PeerVerificationState
  /**
   * The entry arrived in a transcript backfill: another peer's account of what
   * was said before this client joined. The author it names is that peer's
   * say-so and nothing here can check it, so it must never look like a message
   * from a verified sender.
   */
  isRelayed?: true
}

export type ReceivedMessage = UnsentMessage & {
  timeReceived: number
} & AuthorVerification

export type Message = UnsentMessage | ReceivedMessage

/**
 * Everything a peer needs to fetch and decrypt an offered set of files.
 *
 * The two travel together because neither is useful alone. The magnet URI
 * reaches the torrent swarm and its tracker, which anyone can watch; the key
 * never leaves the room's peer connections. It is random per offer rather than
 * derived from anything about the room, so knowing or guessing the room name
 * does not decrypt a torrent seen on the tracker.
 */
export type FileReference = {
  magnetURI: string
  fileKey: string
}

export type UnsentInlineMedia = Omit<UnsentMessage, 'text'> & FileReference

export type ReceivedInlineMedia = UnsentInlineMedia & {
  timeReceived: number
} & AuthorVerification

export type InlineMedia = UnsentInlineMedia | ReceivedInlineMedia

export type MessageLog = (Message | InlineMedia)[]

export enum AudioState {
  PLAYING = 'PLAYING',
  STOPPED = 'STOPPED',
}

export enum VideoState {
  PLAYING = 'PLAYING',
  STOPPED = 'STOPPED',
}

export enum StreamType {
  WEBCAM = 'WEBCAM',
  SCREEN_SHARE = 'SCREEN_SHARE',
  MICROPHONE = 'MICROPHONE',
}

export enum ScreenShareState {
  SHARING = 'SHARING',
  NOT_SHARING = 'NOT_SHARING',
}

export enum PeerVerificationState {
  VERIFYING,
  UNVERIFIED,
  VERIFIED,
}

export enum AudioChannelName {
  MICROPHONE = 'microphone',
  SCREEN_SHARE = 'screen-share',
}

export type PeerAudioChannelState = Record<AudioChannelName, AudioState>

export interface Peer {
  peerId: string
  userId: string
  publicKey: CryptoKey
  customUsername: string
  audioChannelState: PeerAudioChannelState
  videoState: VideoState
  screenShareState: ScreenShareState
  offeredFile: Readonly<FileReference> | null
  isTypingGroupMessage: boolean
  isTypingDirectMessage: boolean
  verificationState: PeerVerificationState
}

export const isMessageReceived = (
  message: Message | InlineMedia
): message is ReceivedMessage | ReceivedInlineMedia => 'timeReceived' in message

export const isInlineMedia = (
  message: Message | InlineMedia
): message is InlineMedia => {
  return 'magnetURI' in message
}

export type FileOfferMetadata = FileReference & {
  isAllInlineMedia: boolean
}

/**
 * How many random bytes a file key holds: 256 bits, far beyond guessing,
 * whatever the key derivation costs. `generateFileKey` makes keys of this size
 * and {@link isFileKey} accepts only this size, so both follow from here.
 */
export const FILE_KEY_BYTE_LENGTH = 32

/** Unpadded base64 spends four characters on every three bytes, rounding up. */
const fileKeyCharacterLength = Math.ceil((FILE_KEY_BYTE_LENGTH * 4) / 3)

/**
 * The shape of a file key: {@link FILE_KEY_BYTE_LENGTH} random bytes as
 * unpadded base64url. Checked exactly, rather than as any string, so a peer
 * cannot hand over a short or guessable key as if it were one of ours.
 */
const fileKeyPattern = new RegExp(`^[A-Za-z0-9_-]{${fileKeyCharacterLength}}$`)

export const isFileKey = (value: unknown): value is string =>
  typeof value === 'string' && fileKeyPattern.test(value)

export type TypingStatus = {
  isTyping: boolean
}
