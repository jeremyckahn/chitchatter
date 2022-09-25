export interface UnsentMessage {
  id: string
  text: string
  timeSent: number
  authorId: string
}

export interface User {
  peerId: string
  userId: string
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}

export const isMessageReceived = (
  message: Message
): message is ReceivedMessage => 'timeReceived' in message

export type Message = UnsentMessage | ReceivedMessage
