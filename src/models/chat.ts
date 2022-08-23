export interface UnsentMessage {
  id: string
  text: string
  timeSent: number
  authorId: string
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}

export const isMessageReceived = (
  message: UnsentMessage
): message is ReceivedMessage => 'timeReceived' in message
