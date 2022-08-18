export interface UnsentMessage {
  text: string
  timeSent: number
}

export interface ReceivedMessage extends UnsentMessage {
  timeReceived: number
}
