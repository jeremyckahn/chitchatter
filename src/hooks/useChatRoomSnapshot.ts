import { useCallback, useRef, useSyncExternalStore } from 'react'

import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent } from 'core/chat/events'

/**
 * The only thing this needs of a room: something to subscribe to.
 *
 * Kept as a `Pick` rather than `ChatRoom` so that a consumer can declare the
 * handful of members it reads and have the compiler check a test stub against
 * them, instead of asserting a partial object into a whole class.
 */
export type ChatRoomSubscribable = Pick<ChatRoom, 'on'>

/**
 * Subscribes a component to one slice of a {@link ChatRoom}'s state.
 *
 * `useSyncExternalStore` is the right primitive here: ChatRoom is an external
 * mutable source, and this handles tearing under concurrent rendering. It
 * requires `getSnapshot` to return a stable reference between changes, which is
 * why ChatRoom caches its snapshots instead of building fresh arrays per read.
 */
export const useChatRoomSnapshot = <TRoom extends ChatRoomSubscribable, T>(
  chatRoom: TRoom | null,
  events: readonly ChatRoomEvent[],
  getSnapshot: (chatRoom: TRoom) => T,
  fallback: T
): T => {
  // Held in a ref so that `subscribe` and `read` depend only on the room
  // instance. Resubscribing on every render would drop events mid-flight, and
  // a new `read` identity on every render would defeat the snapshot caching.
  const latest = useRef({ events, getSnapshot, fallback })

  latest.current = { events, getSnapshot, fallback }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!chatRoom) return () => {}

      const unsubscribers = latest.current.events.map(event =>
        chatRoom.on(event, onStoreChange)
      )

      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe()
      }
    },
    [chatRoom]
  )

  const read = useCallback(
    () =>
      chatRoom ? latest.current.getSnapshot(chatRoom) : latest.current.fallback,
    [chatRoom]
  )

  return useSyncExternalStore(subscribe, read, read)
}
