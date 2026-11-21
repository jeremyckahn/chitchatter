import { useContext, useMemo } from 'react'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { findUserIdsSharingPeerName } from 'core/names/peerNames'

import { getPeerName } from './getPeerName'

export const usePeerNameDisplay = () => {
  const { getUserSettings } = useContext(SettingsContext)
  const { peerList, customUsername: selfCustomUsername } =
    useContext(ShellContext)

  const { userId: selfUserId } = getUserSettings()

  const isPeerSelf = (userId: string) => selfUserId === userId

  const userIdsSharingPeerName = useMemo(
    () => findUserIdsSharingPeerName({ selfUserId, peers: peerList }),
    [selfUserId, peerList]
  )

  /**
   * Whether another user in the room has the same generated name as `userId`,
   * so that the name alone cannot tell them apart.
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
