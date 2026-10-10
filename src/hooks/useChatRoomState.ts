import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent } from 'core/chat/events'
import { FileOffers } from 'core/chat/fileOffers'
import { MessageLog, Peer } from 'core/models/chat'
import { PeerConnectionType } from 'core/transport/types'
import { useChatRoomSnapshot } from 'hooks/useChatRoomSnapshot'

const noPeers: readonly Peer[] = []
const noMessages: MessageLog = []
const noOffers: FileOffers = {}
const noConnectionTypes: Readonly<Record<string, PeerConnectionType>> = {}

const readPeers = (chatRoom: ChatRoom) => chatRoom.getPeers()
const readMessageLog = (chatRoom: ChatRoom) => chatRoom.getMessageLog()
const readFileOffers = (chatRoom: ChatRoom) => chatRoom.getFileOffers()
const readIsMessageSending = (chatRoom: ChatRoom) =>
  chatRoom.getIsMessageSending()
const readConnectionTypes = (chatRoom: ChatRoom) =>
  chatRoom.getConnectionTypes()

const peerEvents = [ChatRoomEvent.PEER_LIST_CHANGE] as const
const messageEvents = [ChatRoomEvent.MESSAGE_LOG_CHANGE] as const
const offerEvents = [ChatRoomEvent.FILE_OFFER_CHANGE] as const
const sendingEvents = [ChatRoomEvent.SENDING_STATE_CHANGE] as const
const connectionTypeEvents = [ChatRoomEvent.CONNECTION_TYPES_CHANGE] as const

export const useChatRoomPeers = (chatRoom: ChatRoom | null) =>
  useChatRoomSnapshot(chatRoom, peerEvents, readPeers, noPeers)

export const useChatRoomMessageLog = (chatRoom: ChatRoom | null) =>
  useChatRoomSnapshot(chatRoom, messageEvents, readMessageLog, noMessages)

export const useChatRoomFileOffers = (chatRoom: ChatRoom | null) =>
  useChatRoomSnapshot(chatRoom, offerEvents, readFileOffers, noOffers)

export const useChatRoomIsMessageSending = (chatRoom: ChatRoom | null) =>
  useChatRoomSnapshot(chatRoom, sendingEvents, readIsMessageSending, false)

export const useChatRoomConnectionTypes = (chatRoom: ChatRoom | null) =>
  useChatRoomSnapshot(
    chatRoom,
    connectionTypeEvents,
    readConnectionTypes,
    noConnectionTypes
  )
