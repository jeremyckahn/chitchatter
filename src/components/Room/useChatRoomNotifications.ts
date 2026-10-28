import { useContext, useEffect, useRef, useState } from 'react'

import { usePeerNameDisplay } from 'components/PeerNameDisplay'
import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent, ChatRoomErrorContext } from 'core/chat/events'
import { isInlineMedia } from 'core/models/chat'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { getSharedAudio } from 'lib/Audio'
import { notification } from 'services/Notification'

/**
 * What to tell the user when a ChatRoom operation fails, keyed by the failing
 * operation. `null` means the failure is logged but not shown: background,
 * ephemeral and teardown paths the user did not initiate or has already left.
 * The record is complete, so adding a ChatRoomErrorContext without deciding
 * show-or-suppress here fails to compile.
 */
const userFacingErrorMessages: Record<ChatRoomErrorContext, string | null> = {
  [ChatRoomErrorContext.SEND_MESSAGE]: 'Your message could not be sent',
  [ChatRoomErrorContext.SEND_INLINE_MEDIA]: 'Your media could not be sent',
  [ChatRoomErrorContext.RESCIND_FILE_OFFER]:
    'Stopping the file share did not fully succeed',
  [ChatRoomErrorContext.ANNOUNCE_SELF]: null,
  [ChatRoomErrorContext.GREET_PEER]: null,
  [ChatRoomErrorContext.REFRESH_CONNECTION_TYPES]: null,
  [ChatRoomErrorContext.SEND_TYPING_STATUS]: null,
  [ChatRoomErrorContext.STOP_SEEDING]: null,
  [ChatRoomErrorContext.LEAVE]: null,
}

/**
 * The presentation response to chat events: snackbars, sounds, desktop
 * notifications and the unread counter.
 *
 * All of this used to live inside the protocol handlers, which is why the
 * protocol could not run without a DOM. The core now reports *what happened*
 * and this decides what the user should see or hear about it.
 */
export const useChatRoomNotifications = (
  chatRoom: ChatRoom | null,
  {
    isShowingMessages,
    isDirectMessageRoom,
  }: { isShowingMessages: boolean; isDirectMessageRoom: boolean }
) => {
  const { showAlert, tabHasFocus } = useContext(ShellContext)
  const { getUserSettings } = useContext(SettingsContext)
  const { getDisplayUsername } = usePeerNameDisplay()
  const [unreadMessages, setUnreadMessages] = useState(0)

  const { selectedSound } = getUserSettings()

  // Looked up per render rather than held in state: the lookup is a map read
  // after the first call for a sound, and holding it would mean rebuilding an
  // `AudioContext` whenever the setting changed.
  const newMessageAudio = getSharedAudio(selectedSound)

  // Kept in a ref so that changing settings or focus does not resubscribe the
  // listeners, which would risk dropping an event mid-flight.
  const latest = useRef({
    getUserSettings,
    getDisplayUsername,
    isShowingMessages,
    newMessageAudio,
    showAlert,
    tabHasFocus,
  })

  latest.current = {
    getUserSettings,
    getDisplayUsername,
    isShowingMessages,
    newMessageAudio,
    showAlert,
    tabHasFocus,
  }

  useEffect(() => {
    if (isShowingMessages) setUnreadMessages(0)
  }, [isShowingMessages])

  useEffect(() => {
    if (!chatRoom) return

    const unsubscribers = [
      chatRoom.on(ChatRoomEvent.MESSAGE_RECEIVED, ({ message }) => {
        const {
          getUserSettings: readSettings,
          getDisplayUsername: displayNameFor,
          isShowingMessages: showing,
          newMessageAudio: audio,
          tabHasFocus: hasFocus,
        } = latest.current
        const userSettings = readSettings()

        if (!showing) setUnreadMessages(count => count + 1)

        // Stay quiet when the user is already looking at the conversation.
        if (hasFocus && showing) return

        if (userSettings.playSoundOnNewMessage) audio.play()

        if (userSettings.showNotificationOnNewMessage) {
          const displayUsername = displayNameFor(message.authorId)

          notification.showNotification(
            isInlineMedia(message)
              ? `${displayUsername} shared media`
              : `${displayUsername}: ${message.text}`
          )
        }
      }),

      // Operations the user just performed on purpose report their failures
      // here instead of throwing; surface those so a failed send is not silent.
      // Background, ephemeral and teardown failures stay logger-only.
      chatRoom.on(ChatRoomEvent.ERROR, ({ context }) => {
        const message = userFacingErrorMessages[context]

        if (message === null) return

        latest.current.showAlert(message, { severity: 'error' })
      }),

      // Who is in the room is a property of the room, not of a conversation
      // within it, and every peer has a direct-message room open behind its
      // dialog. Announcing membership from those too would show one snackbar
      // per departure *per* open conversation.
      ...(isDirectMessageRoom
        ? []
        : [
            chatRoom.on(ChatRoomEvent.PEER_JOIN, () => {
              latest.current.showAlert('Someone has joined the room', {
                severity: 'success',
              })
            }),

            chatRoom.on(ChatRoomEvent.PEER_LEAVE, ({ peer }) => {
              const who = peer
                ? latest.current.getDisplayUsername(peer.userId)
                : 'Someone'

              latest.current.showAlert(`${who} has left the room`, {
                severity: 'warning',
              })
            }),

            chatRoom.on(
              ChatRoomEvent.PEER_RENAME,
              ({ previousDisplayName, displayName }) => {
                latest.current.showAlert(
                  `${previousDisplayName} is now ${displayName}`
                )
              }
            ),
          ]),
    ]

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  }, [chatRoom, isDirectMessageRoom])

  return { unreadMessages }
}
