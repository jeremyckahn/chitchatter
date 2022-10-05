import { useContext, useEffect, useState } from 'react'
import { BaseRoomConfig } from 'trystero'
import { TorrentRoomConfig } from 'trystero/torrent'
import { v4 as uuid } from 'uuid'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { PeerActions } from 'models/network'
import { ReceivedMessage, UnsentMessage } from 'models/chat'
import { funAnimalName } from 'fun-animal-names'
import { getPeerName } from 'components/PeerNameDisplay'
import { NotificationService } from 'services/Notification'
import { Audio } from 'services/Audio'
import { PeerRoom } from 'services/PeerRoom'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomConfig {
  roomId: string
  userId: string
  getUuid?: typeof uuid
}

export function useRoom(
  roomConfig: BaseRoomConfig & TorrentRoomConfig,
  { roomId, userId, getUuid = uuid }: UseRoomConfig
) {
  const [peerRoom] = useState(() => new PeerRoom(roomConfig, roomId))
  const [numberOfPeers, setNumberOfPeers] = useState(1) // Includes this peer
  const shellContext = useContext(ShellContext)
  const settingsContext = useContext(SettingsContext)
  const [isMessageSending, setIsMessageSending] = useState(false)
  const [messageLog, setMessageLog] = useState<
    Array<ReceivedMessage | UnsentMessage>
  >([])
  const [newMessageAudio] = useState(
    () => new Audio(process.env.PUBLIC_URL + '/sounds/new-message.aac')
  )

  useEffect(() => {
    return () => {
      peerRoom.leaveRoom()
    }
  }, [peerRoom])

  useEffect(() => {
    shellContext.setDoShowPeers(true)

    return () => {
      shellContext.setDoShowPeers(false)
    }
  }, [shellContext])

  const [sendPeerId, receivePeerId] = usePeerRoomAction<string>(
    peerRoom,
    PeerActions.PEER_NAME
  )

  const [sendPeerMessage, receivePeerMessage] =
    usePeerRoomAction<UnsentMessage>(peerRoom, PeerActions.MESSAGE)

  const sendMessage = async (message: string) => {
    if (isMessageSending) return

    const unsentMessage: UnsentMessage = {
      authorId: userId,
      text: message,
      timeSent: Date.now(),
      id: getUuid(),
    }

    setIsMessageSending(true)
    setMessageLog([...messageLog, unsentMessage])
    await sendPeerMessage(unsentMessage)

    setMessageLog([
      ...messageLog,
      { ...unsentMessage, timeReceived: Date.now() },
    ])
    setIsMessageSending(false)
  }

  receivePeerId((userId: string, peerId: string) => {
    const peerIndex = shellContext.peerList.findIndex(
      peer => peer.peerId === peerId
    )
    if (peerIndex === -1) {
      shellContext.setPeerList([
        ...shellContext.peerList,
        { peerId: peerId, userId: userId },
      ])
    } else {
      const peerListClone = [...shellContext.peerList]
      peerListClone[peerIndex].userId = userId
      shellContext.setPeerList(peerListClone)
    }
  })

  receivePeerMessage(message => {
    const userSettings = settingsContext.getUserSettings()

    if (!shellContext.tabHasFocus) {
      if (userSettings.playSoundOnNewMessage) {
        newMessageAudio.play()
      }

      if (userSettings.showNotificationOnNewMessage) {
        NotificationService.showNotification(
          `${getPeerName(message.authorId)}: ${message.text}`
        )
      }
    }

    setMessageLog([...messageLog, { ...message, timeReceived: Date.now() }])
  })

  peerRoom.onPeerJoin((peerId: string) => {
    shellContext.showAlert(`Someone has joined the room`, {
      severity: 'success',
    })

    const newNumberOfPeers = numberOfPeers + 1
    setNumberOfPeers(newNumberOfPeers)
    shellContext.setNumberOfPeers(newNumberOfPeers)
    ;(async () => {
      try {
        await sendPeerId(userId, peerId)
      } catch (e) {
        console.error(e)
      }
    })()
  })

  peerRoom.onPeerLeave((peerId: string) => {
    const peerIndex = shellContext.peerList.findIndex(
      peer => peer.peerId === peerId
    )
    const peerExist = peerIndex !== -1
    shellContext.showAlert(
      `${
        peerExist
          ? funAnimalName(shellContext.peerList[peerIndex].userId)
          : 'Someone'
      } has left the room`,
      {
        severity: 'warning',
      }
    )

    const newNumberOfPeers = numberOfPeers - 1
    setNumberOfPeers(newNumberOfPeers)
    shellContext.setNumberOfPeers(newNumberOfPeers)

    if (peerExist) {
      const peerListClone = [...shellContext.peerList]
      peerListClone.splice(peerIndex, 1)
      shellContext.setPeerList(peerListClone)
    }
  })

  return {
    peerRoom,
    messageLog,
    sendMessage,
    isMessageSending,
  }
}
