export interface UnsentMessage {
  id: string
  text: string
  timeSent: number
  authorId: string
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}

export type Message = UnsentMessage | ReceivedMessage

export interface UnsentInlineMedia extends Omit<UnsentMessage, 'text'> {
  magnetURI: string
}

export interface ReceivedInlineMedia extends UnsentInlineMedia {
  timeReceived: number
}

export type InlineMedia = UnsentInlineMedia | ReceivedInlineMedia

export enum AudioState {
  PLAYING = 'PLAYING',
  STOPPED = 'STOPPED',
}

export enum VideoState {
  PLAYING = 'PLAYING',
  STOPPED = 'STOPPED',
}

export enum VideoStreamType {
  WEBCAM = 'WEBCAM',
  SCREEN_SHARE = 'SCREEN_SHARE',
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

export interface Peer {
  peerId: string
  userId: string
  publicKey: CryptoKey
  customUsername: string
  audioState: AudioState
  videoState: VideoState
  screenShareState: ScreenShareState
  offeredFileId: string | null
  isTyping: boolean
  verificationToken: string
  encryptedVerificationToken: ArrayBuffer
  verificationState: PeerVerificationState
  verificationTimer: NodeJS.Timeout | null
}

export const isMessageReceived = (
  message: Message | InlineMedia
): message is ReceivedMessage | ReceivedInlineMedia => 'timeReceived' in message

export const isInlineMedia = (
  message: Message | InlineMedia
): message is InlineMedia => {
  return 'magnetURI' in message
}

export interface FileOfferMetadata {
  magnetURI: string
  isAllInlineMedia: boolean
}

export interface TypingStatus {
  isTyping: boolean
}
