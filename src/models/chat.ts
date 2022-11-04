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

export interface Peer {
  peerId: string
  userId: string
  audioState: AudioState
  videoState: VideoState
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}

export const isMessageReceived = (
  message: Message
): message is ReceivedMessage => 'timeReceived' in message

export type Message = UnsentMessage | ReceivedMessage
