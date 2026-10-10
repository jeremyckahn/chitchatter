import {
  FileOfferMetadata,
  InlineMedia,
  Message,
  MessageLog,
  Peer,
  PeerVerificationState,
  ReceivedInlineMedia,
  ReceivedMessage,
} from 'core/models/chat'
import { PeerConnectionType } from 'core/transport/types'

export enum ChatRoomEvent {
  /** The transcript changed, for any reason. Render from this. */
  MESSAGE_LOG_CHANGE = 'messageLogChange',
  /**
   * A message arrived from a peer. Fires alongside MESSAGE_LOG_CHANGE, because
   * the two have different consumers: rendering keys off the log, while sound
   * and notifications key off the discrete arrival.
   */
  MESSAGE_RECEIVED = 'messageReceived',
  PEER_LIST_CHANGE = 'peerListChange',
  PEER_JOIN = 'peerJoin',
  PEER_LEAVE = 'peerLeave',
  /** A known peer changed its advertised username. */
  PEER_RENAME = 'peerRename',
  PEER_VERIFICATION = 'peerVerification',
  TYPING_STATUS_CHANGE = 'typingStatusChange',
  FILE_OFFER_CHANGE = 'fileOfferChange',
  SENDING_STATE_CHANGE = 'sendingStateChange',
  CONNECTION_TYPES_CHANGE = 'connectionTypesChange',
  ERROR = 'error',
}

export interface ChatRoomEventPayloads {
  [ChatRoomEvent.MESSAGE_LOG_CHANGE]: { messageLog: MessageLog }
  [ChatRoomEvent.MESSAGE_RECEIVED]: {
    message: ReceivedMessage | ReceivedInlineMedia
    peerId: string
  }
  [ChatRoomEvent.PEER_LIST_CHANGE]: { peers: readonly Peer[] }
  [ChatRoomEvent.PEER_JOIN]: { peerId: string }
  [ChatRoomEvent.PEER_LEAVE]: { peerId: string; peer: Peer | null }
  [ChatRoomEvent.PEER_RENAME]: {
    peerId: string
    previousDisplayName: string
    displayName: string
  }
  [ChatRoomEvent.PEER_VERIFICATION]: {
    peerId: string
    verificationState: PeerVerificationState
  }
  [ChatRoomEvent.TYPING_STATUS_CHANGE]: { peerId: string; isTyping: boolean }
  [ChatRoomEvent.FILE_OFFER_CHANGE]: {
    peerId: string
    metadata: FileOfferMetadata | null
  }
  [ChatRoomEvent.SENDING_STATE_CHANGE]: { isMessageSending: boolean }
  [ChatRoomEvent.CONNECTION_TYPES_CHANGE]: {
    connectionTypes: Readonly<Record<string, PeerConnectionType>>
  }
  [ChatRoomEvent.ERROR]: { error: Error; context: string }
}

export type ChatRoomEventListener<T extends ChatRoomEvent> = (
  payload: ChatRoomEventPayloads[T]
) => void

export type SentMessage = Message | InlineMedia
