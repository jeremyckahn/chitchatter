import { useContext } from 'react'
import { SettingsContext } from 'contexts/SettingsContext'
import { SharedPeerNamesContext } from 'contexts/SharedPeerNamesContext'
import { ShellContext } from 'contexts/ShellContext'

import { getPeerName } from './getPeerName'

export const usePeerNameDisplay = () => {
  const { getUserSettings } = useContext(SettingsContext)
  const { peerList, customUsername: selfCustomUsername } =
    useContext(ShellContext)
  const userIdsSharingPeerName = useContext(SharedPeerNamesContext)

  const { userId: selfUserId } = getUserSettings()

  const isPeerSelf = (userId: string) => selfUserId === userId

  /**
   * Whether another user in the room (or a proven author in the chat history)
   * has the same generated name or custom username as `userId`, so that the
   * name alone cannot tell them apart.
   */
  const isPeerNameShared = (userId: string): boolean =>
    userIdsSharingPeerName.has(userId)

  const getPeer = (userId: string) =>
    peerList.find(peer => peer.userId === userId)

  const getCustomUsername = (userId: string) =>
    isPeerSelf(userId)
      ? selfCustomUsername
      : (getPeer(userId)?.customUsername ?? '')

  const getFriendlyName = (userId: string) => {
    const customUsername = getCustomUsername(userId)
    const friendlyName = customUsername || getPeerName(userId)

    return friendlyName
  }

  const getDisplayUsername = (userId: string) => {
    const friendlyName = getFriendlyName(userId)
    const customUsername = getCustomUsername(userId)

    let displayUsername: string

    if (customUsername === friendlyName) {
      displayUsername = `${friendlyName} (${getPeerName(userId)})`
    } else {
      displayUsername = getPeerName(userId)
    }

    return displayUsername
  }

  return {
    getCustomUsername,
    isPeerSelf,
    isPeerNameShared,
    getFriendlyName,
    getDisplayUsername,
  }
}
