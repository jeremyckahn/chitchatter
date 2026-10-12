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

export type ReceivedMessage = UnsentMessage & {
  timeReceived: number
}

export type Message = UnsentMessage | ReceivedMessage

export type UnsentInlineMedia = Omit<UnsentMessage, 'text'> & {
  magnetURI: string
}

export type ReceivedInlineMedia = UnsentInlineMedia & {
  timeReceived: number
}

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
  offeredFileId: string | null
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

export type FileOfferMetadata = {
  magnetURI: string
  isAllInlineMedia: boolean
}

export type TypingStatus = {
  isTyping: boolean
}
