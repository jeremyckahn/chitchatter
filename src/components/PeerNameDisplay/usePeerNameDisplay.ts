import { useContext } from 'react'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'

import { getPeerName } from './getPeerName'

// Constants to avoid magic numbers
export const SHORT_ID_MAX_LENGTH = 12
export const SHORT_ID_PREFIX_LENGTH = 4
export const SHORT_ID_SUFFIX_LENGTH = 3

// Utility to shorten userId if too long
export const getShortenedUserId = (userId: string): string => {
  if (userId.length <= SHORT_ID_MAX_LENGTH) return userId

  const prefix = userId.slice(0, SHORT_ID_PREFIX_LENGTH)
  const suffix = userId.slice(-SHORT_ID_SUFFIX_LENGTH)
  return `${prefix}...${suffix}`
}

export const usePeerNameDisplay = () => {
  const { getUserSettings } = useContext(SettingsContext)
  const { peerList, customUsername: selfCustomUsername } =
    useContext(ShellContext)

  const { userId: selfUserId } = getUserSettings()

  const isPeerSelf = (userId: string): boolean => selfUserId === userId

  const getPeer = (userId: string) =>
    peerList.find(peer => peer.userId === userId)

  const getCustomUsername = (userId: string): string =>
    isPeerSelf(userId)
      ? selfCustomUsername
      : (getPeer(userId)?.customUsername ?? '')

  const getFriendlyName = (userId: string): string => {
    const customUsername = getCustomUsername(userId)
    return customUsername || getPeerName(userId)
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
    getFriendlyName,
    getDisplayUsername,
    getShortenedUserId,
  }
}
