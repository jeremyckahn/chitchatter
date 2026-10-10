import { ChatRoom } from 'core/chat/ChatRoom'

/**
 * Holds the chat rooms a host currently has open: one group room, plus a
 * direct-message room per peer.
 *
 * Its reason to exist is lifetime. A direct-message conversation outlives the
 * UI that shows it — closing and reopening a DM should not lose the transcript
 * — so the rooms cannot be owned by whatever renders them.
 */
export class ChatRoomRegistry {
  private group: ChatRoom | null = null

  private direct: Map<string, ChatRoom> = new Map()

  getGroup = () => this.group

  setGroup = (chatRoom: ChatRoom | null) => {
    this.group = chatRoom
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
