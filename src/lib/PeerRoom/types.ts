export type DataPayload =
  | string
  | number
  | object
  | Uint8Array
  | ArrayBuffer
  | null

export type ActionSender<T extends DataPayload> = (
  data: T,
  targetPeers?: string | string[] | null
) => Promise<void>[]

export type ActionReceiver<T extends DataPayload> = (
  callback: (
    data: T,
    peerId: string,
    metadata?: Record<string, unknown>
  ) => void
) => void

export type ActionProgress = (
  callback: (
    percent: number,
    peerId: string,
    metadata?: Record<string, unknown>
  ) => void
) => void

export interface RoomConfig {
  appId?: string
  password?: string
  rtcConfig?: RTCConfiguration
  signalingServerUrl: string
  sfuApiBase?: string
}

export interface SignalingInitMessage {
  type: 'init'
  peerId: string
  peerIds: string[]
}

export interface SignalingPeerJoinedMessage {
  type: 'peer-joined'
  peerId: string
}

export interface SignalingPeerLeftMessage {
  type: 'peer-left'
  peerId: string
}

export interface SignalingOfferMessage {
  type: 'offer'
  fromPeerId: string
  sdp: RTCSessionDescriptionInit
}

export interface SignalingAnswerMessage {
  type: 'answer'
  fromPeerId: string
  sdp: RTCSessionDescriptionInit
}

export interface SignalingIceCandidateMessage {
  type: 'ice-candidate'
  fromPeerId: string
  candidate: RTCIceCandidateInit
}

export type SignalingIncomingMessage =
  | SignalingInitMessage
  | SignalingPeerJoinedMessage
  | SignalingPeerLeftMessage
  | SignalingOfferMessage
  | SignalingAnswerMessage
  | SignalingIceCandidateMessage

export interface DataChannelMessage {
  action: string
  data: unknown
  chunkIndex?: number
  totalChunks?: number
}

export interface StreamMetadataMessage {
  action: '__stream_metadata__'
  data: {
    streamId: string
    metadata: Record<string, unknown>
  }
}
