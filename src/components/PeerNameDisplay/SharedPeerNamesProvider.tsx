import { PropsWithChildren, useContext, useMemo } from 'react'

import { SettingsContext } from 'contexts/SettingsContext'
import { SharedPeerNamesContext } from 'contexts/SharedPeerNamesContext'
import { ShellContext } from 'contexts/ShellContext'
import { findUserIdsSharingPeerName } from 'core/names/peerNames'
import { useChatRoomMessageLog } from 'hooks/useChatRoomState'

/**
 * Computes the set of user ids sharing a name once per change of peers, local
 * identity, or chat history, and publishes it via {@link SharedPeerNamesContext}
 * so each message and peer-list entry only performs an O(1) lookup.
 */
export const SharedPeerNamesProvider = ({ children }: PropsWithChildren) => {
  const { getUserSettings } = useContext(SettingsContext)
  const {
    chatRoom,
    peerList,
    customUsername: selfCustomUsername,
  } = useContext(ShellContext)

  const { userId: selfUserId } = getUserSettings()
  const messageLog = useChatRoomMessageLog(chatRoom)

  const userIdsSharingPeerName = useMemo(
    () =>
      findUserIdsSharingPeerName({
        selfUserId,
        selfCustomUsername,
        peers: peerList,
        messages: messageLog,
      }),
    [selfUserId, selfCustomUsername, peerList, messageLog]
  )

  return (
    <SharedPeerNamesContext.Provider value={userIdsSharingPeerName}>
      {children}
    </SharedPeerNamesContext.Provider>
  )
}
