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

/**
 * Which {@link ChatRoom} operation an error came out of.
 *
 * The room reports failures it cannot hand back to a caller instead of
 * throwing them, and a host listening on {@link ChatRoomEvent.ERROR} needs to
 * know *which* operation failed to decide what to say about it. The set of
 * reporting sites is fixed and known at build time, so it is an enum: a typo
 * cannot reach a listener, adding a site is a deliberate edit here, and a
 * consumer can exhaustively switch on it.
 *
 * The values are the method names, which is what the logger prefixes with
 * `ChatRoom.`.
 */
export enum ChatRoomErrorContext {
  ANNOUNCE_SELF = 'announceSelf',
  GREET_PEER = 'greetPeer',
  LEAVE = 'leave',
  REFRESH_CONNECTION_TYPES = 'refreshConnectionTypes',
  RESCIND_FILE_OFFER = 'rescindFileOffer',
  SEND_INLINE_MEDIA = 'sendInlineMedia',
  SEND_MESSAGE = 'sendMessage',
  SEND_TYPING_STATUS = 'sendTypingStatus',
  STOP_SEEDING = 'stopSeeding',
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
  [ChatRoomEvent.ERROR]: { error: Error; context: ChatRoomErrorContext }
}

export type ChatRoomEventListener<T extends ChatRoomEvent> = (
  payload: ChatRoomEventPayloads[T]
) => void

export type SentMessage = Message | InlineMedia
