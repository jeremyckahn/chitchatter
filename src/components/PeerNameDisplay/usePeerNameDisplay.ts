import { useContext } from 'react'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'

import { getPeerName } from './getPeerName'

export const usePeerNameDisplay = () => {
  const { getUserSettings } = useContext(SettingsContext)
  const { peerList, customUsername: selfCustomUsername } =
    useContext(ShellContext)

  const { userId: selfUserId } = getUserSettings()

  const isPeerSelf = (userId: string) => selfUserId === userId

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

  // Returns a shortened version of the user ID for display.
  const getShortenedUserId = (userId: string): string => {
    if (userId.length <= 12) {
      return userId
    }
    return `${userId.slice(0, 6)}...${userId.slice(-3)}`
  }

  return {
    getCustomUsername,
    isPeerSelf,
    getFriendlyName,
    getDisplayUsername,
    getShortenedUserId,
  }
}
