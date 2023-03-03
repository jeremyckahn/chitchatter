import { useContext } from 'react'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'

import { getPeerName } from './getPeerName'

export const usePeerNameDisplay = (rootUserIdToResolve: string) => {
  const { getUserSettings } = useContext(SettingsContext)
  const { peerList, customUsername: selfCustomUsername } =
    useContext(ShellContext)

  const { userId: selfUserId } = getUserSettings()

  const isPeerSelf = (userIdToResolve: string) => selfUserId === userIdToResolve

  const getPeer = (userIdToResolve: string) =>
    peerList.find(peer => peer.userId === userIdToResolve)

  const peer = getPeer(rootUserIdToResolve)

  const userId = isPeerSelf(rootUserIdToResolve)
    ? selfUserId
    : peer?.userId ?? getPeerName(rootUserIdToResolve)

  const getCustomUsername = (userIdToResolve: string) =>
    isPeerSelf(userIdToResolve)
      ? selfCustomUsername
      : getPeer(userIdToResolve)?.customUsername

  const getFriendlyName = (userIdToResolve: string) => {
    const customUsername = getCustomUsername(userIdToResolve)
    const friendlyName = customUsername || getPeerName(userIdToResolve)

    return friendlyName
  }

  const getDisplayUsername = (userIdToResolve: string) => {
    const friendlyName = getFriendlyName(userIdToResolve)
    const customUsername = getCustomUsername(userIdToResolve)

    let displayUsername: string

    if (customUsername === friendlyName) {
      displayUsername = `${friendlyName} (${getPeerName(userIdToResolve)})`
    } else {
      displayUsername = getPeerName(userIdToResolve)
    }

    return displayUsername
  }

  return {
    userId,
    getCustomUsername,
    isPeerSelf,
    getFriendlyName,
    getDisplayUsername,
  }
}
