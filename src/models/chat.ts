export interface UnsentMessage {
  id: string
  text: string
  timeSent: number
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}
