import { useCallback, useRef, useSyncExternalStore } from 'react'

import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent } from 'core/chat/events'

/**
 * Subscribes a component to one slice of a {@link ChatRoom}'s state.
 *
 * `useSyncExternalStore` is the right primitive here: ChatRoom is an external
 * mutable source, and this handles tearing under concurrent rendering. It
 * requires `getSnapshot` to return a stable reference between changes, which is
 * why ChatRoom caches its snapshots instead of building fresh arrays per read.
 */
export const useChatRoomSnapshot = <T>(
  chatRoom: ChatRoom | null,
  events: readonly ChatRoomEvent[],
  getSnapshot: (chatRoom: ChatRoom) => T,
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
