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
 * It also relays peer arrivals and departures to the conversations that cannot
 * hear them themselves; see {@link setGroup}.
 */
/**
 * Releases what a host built for a direct-message room alongside it, once the
 * room has left. Platform-neutral on purpose: the registry only sequences it.
 */
export type DirectRoomDisposer = () => void | Promise<void>

interface DirectRoomEntry {
  chatRoom: ChatRoom
  dispose: DirectRoomDisposer | null
}

export class ChatRoomRegistry {
  private group: ChatRoom | null = null

  private direct: Map<string, DirectRoomEntry> = new Map()

  private unsubscribeGroupMembership: (() => void)[] = []

  getGroup = () => this.group

  /**
   * Adopts `chatRoom` as the group room and forwards its peer arrivals and
   * departures to the matching direct-message conversation.
   *
   * The forwarding is here because the transport has one peer-join and one
   * peer-leave slot per `PeerHookType` and the group room holds both, so a
   * direct-message room cannot register for membership changes without
   * clobbering the group room's handlers. Only the group room hears them, and
   * only this registry knows which conversation each one concerns.
   *
   * Both directions are forwarded, not just departures: a conversation that is
   * told its correspondent left will otherwise discard everything that peer
   * sends for the rest of the session, because only an arrival lifts that.
   */
  setGroup = (chatRoom: ChatRoom | null) => {
    for (const unsubscribe of this.unsubscribeGroupMembership) unsubscribe()

    this.unsubscribeGroupMembership = []
    this.group = chatRoom

    if (!chatRoom) return

    this.unsubscribeGroupMembership = [
      chatRoom.on(ChatRoomEvent.PEER_JOIN, ({ peerId }) => {
        this.direct.get(peerId)?.chatRoom.notifyPeerJoined(peerId)
      }),

      chatRoom.on(ChatRoomEvent.PEER_LEAVE, ({ peerId }) => {
        this.direct.get(peerId)?.chatRoom.notifyPeerLeft(peerId)
      }),
    ]
  }

  getDirect = (targetPeerId: string) =>
    this.direct.get(targetPeerId)?.chatRoom ?? null

  /**
   * Adopts `chatRoom` as the conversation with `targetPeerId`.
   *
   * @param dispose Run by {@link clearDirect} once this room's `leave()` has
   * settled, whether it resolved or rejected. A host uses it to release what
   * it built for the room and that must outlive the UI showing it, such as
   * the room's file transfer.
   */
  setDirect = (
    targetPeerId: string,
    chatRoom: ChatRoom,
    dispose: DirectRoomDisposer | null = null
  ) => {
    this.direct.set(targetPeerId, { chatRoom, dispose })
  }

  /**
   * Leaves and forgets every direct-message room, disposing each one after its
   * own `leave()` settles. Rooms are independent: one that never settles holds
   * back only its own disposal.
   */
  clearDirect = async () => {
    const entries = [...this.direct.values()]

    this.direct.clear()

    await Promise.all(
      entries.map(async ({ chatRoom, dispose }) => {
        try {
          await chatRoom.leave()
        } finally {
          await dispose?.()
        }
      })
    )
  }
}
