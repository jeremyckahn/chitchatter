import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent } from 'core/chat/events'

/**
 * Holds the chat rooms a host currently has open: one group room, plus a
 * direct-message room per peer.
 *
 * Its reason to exist is lifetime. A direct-message conversation outlives the
 * UI that shows it — closing and reopening a DM should not lose the transcript
 * — so the rooms cannot be owned by whatever renders them.
 *
 * It also relays peer departures to the conversations that cannot hear them
 * themselves; see {@link setGroup}.
 */
export class ChatRoomRegistry {
  private group: ChatRoom | null = null

  private direct: Map<string, ChatRoom> = new Map()

  private unsubscribeGroupPeerLeave: (() => void) | null = null

  getGroup = () => this.group

  /**
   * Adopts `chatRoom` as the group room and forwards its peer departures to the
   * matching direct-message conversation.
   *
   * The forwarding is here because the transport has one peer-leave slot per
   * `PeerHookType` and the group room holds it, so a direct-message room cannot
   * register for departures without clobbering the group room's handler. Only
   * the group room hears them, and only this registry knows which conversation
   * each one concerns.
   */
  setGroup = (chatRoom: ChatRoom | null) => {
    this.unsubscribeGroupPeerLeave?.()
    this.unsubscribeGroupPeerLeave = null

    this.group = chatRoom

    if (!chatRoom) return

    this.unsubscribeGroupPeerLeave = chatRoom.on(
      ChatRoomEvent.PEER_LEAVE,
      ({ peerId }) => {
        this.direct.get(peerId)?.notifyPeerLeft(peerId)
      }
    )
  }

  getDirect = (targetPeerId: string) => this.direct.get(targetPeerId) ?? null

  setDirect = (targetPeerId: string, chatRoom: ChatRoom) => {
    this.direct.set(targetPeerId, chatRoom)
  }

  /** Leaves and forgets every direct-message room. */
  clearDirect = async () => {
    const rooms = [...this.direct.values()]

    this.direct.clear()

    await Promise.all(rooms.map(chatRoom => chatRoom.leave()))
  }
}
