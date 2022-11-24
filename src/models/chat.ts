export interface UnsentMessage {
  id: string
  text: string
  timeSent: number
  authorId: string
}

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

export interface Peer {
  peerId: string
  userId: string
  audioState: AudioState
  videoState: VideoState
  screenShareState: ScreenShareState
  offeredFileId: string | null
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}

export const isMessageReceived = (
  message: Message
): message is ReceivedMessage => 'timeReceived' in message

export type Message = UnsentMessage | ReceivedMessage
