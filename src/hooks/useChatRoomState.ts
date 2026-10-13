import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent } from 'core/chat/events'
import { FileOffers } from 'core/chat/fileOffers'
import { MessageLog, Peer } from 'core/models/chat'
import { PeerConnectionType } from 'core/transport/types'
import { useChatRoomSnapshot } from 'hooks/useChatRoomSnapshot'

/**
 * The slice of a room each hook reads, named so that a consumer can declare it
 * as a prop and a test can satisfy it with a stub the compiler checks. A real
 * `ChatRoom` satisfies all of them.
 */
export type ChatRoomPeerSource = Pick<ChatRoom, 'on' | 'getPeers'>
export type ChatRoomMessageLogSource = Pick<ChatRoom, 'on' | 'getMessageLog'>
export type ChatRoomFileOfferSource = Pick<ChatRoom, 'on' | 'getFileOffers'>
export type ChatRoomSelfFileOfferSource = Pick<
  ChatRoom,
  'on' | 'getSelfFileOfferMagnetUri'
>
export type ChatRoomSendingSource = Pick<ChatRoom, 'on' | 'getIsMessageSending'>
export type ChatRoomConnectionTypeSource = Pick<
  ChatRoom,
  'on' | 'getConnectionTypes'
>

const noPeers: readonly Peer[] = []
const noMessages: MessageLog = []
const noOffers: FileOffers = {}
const noConnectionTypes: Readonly<Record<string, PeerConnectionType>> = {}

const readPeers = (chatRoom: ChatRoomPeerSource) => chatRoom.getPeers()
const readMessageLog = (chatRoom: ChatRoomMessageLogSource) =>
  chatRoom.getMessageLog()
const readFileOffers = (chatRoom: ChatRoomFileOfferSource) =>
  chatRoom.getFileOffers()
const readSelfFileOffer = (chatRoom: ChatRoomSelfFileOfferSource) =>
  chatRoom.getSelfFileOfferMagnetUri()
const readIsMessageSending = (chatRoom: ChatRoomSendingSource) =>
  chatRoom.getIsMessageSending()
const readConnectionTypes = (chatRoom: ChatRoomConnectionTypeSource) =>
  chatRoom.getConnectionTypes()

const peerEvents = [ChatRoomEvent.PEER_LIST_CHANGE] as const
const messageEvents = [ChatRoomEvent.MESSAGE_LOG_CHANGE] as const
const offerEvents = [ChatRoomEvent.FILE_OFFER_CHANGE] as const
const selfOfferEvents = [ChatRoomEvent.SELF_FILE_OFFER_CHANGE] as const
const sendingEvents = [ChatRoomEvent.SENDING_STATE_CHANGE] as const
const connectionTypeEvents = [ChatRoomEvent.CONNECTION_TYPES_CHANGE] as const

export const useChatRoomPeers = (chatRoom: ChatRoomPeerSource | null) =>
  useChatRoomSnapshot(chatRoom, peerEvents, readPeers, noPeers)

export const useChatRoomMessageLog = (
  chatRoom: ChatRoomMessageLogSource | null
) => useChatRoomSnapshot(chatRoom, messageEvents, readMessageLog, noMessages)

export const useChatRoomFileOffers = (
  chatRoom: ChatRoomFileOfferSource | null
) => useChatRoomSnapshot(chatRoom, offerEvents, readFileOffers, noOffers)

/**
 * The magnet URI this client is currently offering, or `null`.
 *
 * The stop-sharing control is a view of this rather than its own piece of
 * state: the room decides whether an offer exists, and a second copy here could
 * only ever disagree with it.
 */
export const useChatRoomSelfFileOffer = (
  chatRoom: ChatRoomSelfFileOfferSource | null
) => useChatRoomSnapshot(chatRoom, selfOfferEvents, readSelfFileOffer, null)

export const useChatRoomIsMessageSending = (
  chatRoom: ChatRoomSendingSource | null
) => useChatRoomSnapshot(chatRoom, sendingEvents, readIsMessageSending, false)

export const useChatRoomConnectionTypes = (
  chatRoom: ChatRoomConnectionTypeSource | null
) =>
  useChatRoomSnapshot(
    chatRoom,
    connectionTypeEvents,
    readConnectionTypes,
    noConnectionTypes
  )
