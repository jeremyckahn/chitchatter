export interface UnsentMessage {
  id: string
  text: string
  timeSent: number
  authorId: string
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}
