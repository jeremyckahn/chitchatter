import { useContext, useEffect, useRef, useState } from 'react'

import { usePeerNameDisplay } from 'components/PeerNameDisplay'
import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent } from 'core/chat/events'
import { isInlineMedia } from 'core/models/chat'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { Audio } from 'lib/Audio'
import { notification } from 'services/Notification'

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
  { isShowingMessages }: { isShowingMessages: boolean }
) => {
  const { showAlert, tabHasFocus } = useContext(ShellContext)
  const { getUserSettings } = useContext(SettingsContext)
  const { getDisplayUsername } = usePeerNameDisplay()
  const [unreadMessages, setUnreadMessages] = useState(0)

  const { selectedSound } = getUserSettings()
  const [newMessageAudio, setNewMessageAudio] = useState(
    () => new Audio(selectedSound)
  )

  useEffect(() => {
    setNewMessageAudio(new Audio(selectedSound))
  }, [selectedSound])

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
    ]

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  }, [chatRoom])

  return { unreadMessages }
}
