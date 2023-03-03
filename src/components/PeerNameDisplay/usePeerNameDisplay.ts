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

  const customUsername = getCustomUsername(rootUserIdToResolve)

  if (userId === undefined) {
    throw new TypeError('peer lookup failed: userId is undefined')
  }

  const getDisplayUsername = (userIdToResolve: string) => {
    const customUsername = getCustomUsername(userIdToResolve)
    const friendlyName = customUsername || getPeerName(userIdToResolve)

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
    customUsername,
    isPeerSelf,
    getDisplayUsername,
  }
}
