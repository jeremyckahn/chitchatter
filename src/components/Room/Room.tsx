import { useContext, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'

import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'
import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { usePeerRoom, usePeerRoomAction } from 'hooks/usePeerRoom'
import { PeerActions } from 'models/network'
import { Peer, ReceivedMessage, UnsentMessage } from 'models/chat'
import { MessageForm } from 'components/MessageForm'
import { ChatTranscript } from 'components/ChatTranscript'
import { funAnimalName } from 'fun-animal-names'
import { getPeerName } from 'components/PeerNameDisplay'
import { NotificationService } from 'services/Notification'
import { Audio } from 'services/Audio'

export interface RoomProps {
  appId?: string
  getUuid?: typeof uuid
  roomId: string
  userId: string
}

export function Room({
  appId = `${encodeURI(window.location.origin)}_${process.env.REACT_APP_NAME}`,
  getUuid = uuid,
  roomId,
  userId,
}: RoomProps) {
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

  const peerRoom = usePeerRoom(
    {
      appId,
      trackerUrls,
      rtcConfig,
    },
    roomId
  )

  const [sendPeerId, receivePeerId] = usePeerRoomAction<string>(
    peerRoom,
    PeerActions.PEER_NAME
  )

  useEffect(() => {
    shellContext.setDoShowPeers(true)

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

    return () => {
      shellContext.setDoShowPeers(false)
    }
  }, [
    numberOfPeers,
    shellContext.peerList,
    peerRoom,
    sendPeerId,
    shellContext,
    userId,
  ])

  const [sendMessage, receiveMessage] = usePeerRoomAction<UnsentMessage>(
    peerRoom,
    PeerActions.MESSAGE
  )

  const performMessageSend = async (message: string) => {
    if (isMessageSending) return

    const unsentMessage: UnsentMessage = {
      authorId: userId,
      text: message,
      timeSent: Date.now(),
      id: getUuid(),
    }

    setIsMessageSending(true)
    setMessageLog([...messageLog, unsentMessage])
    await sendMessage(unsentMessage)

    setMessageLog([
      ...messageLog,
      { ...unsentMessage, timeReceived: Date.now() },
    ])
    setIsMessageSending(false)
  }

  const upsertToPeerList = (peerToAdd: Peer) => {
    const peerIndex = shellContext.peerList.findIndex(
      peer => peer.peerId === peerToAdd.peerId
    )
    if (peerIndex === -1) {
      shellContext.setPeerList([
        ...shellContext.peerList,
        { peerId: peerToAdd.peerId, userId: peerToAdd.userId },
      ])
    } else {
      const peerListClone = [...shellContext.peerList]
      peerListClone[peerIndex].userId = peerToAdd.userId
      shellContext.setPeerList(peerListClone)
    }
  }

  receivePeerId((userId: string, peerId?: string) => {
    if (peerId) upsertToPeerList({ peerId, userId })
  })

  receiveMessage(message => {
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

  const handleMessageSubmit = async (message: string) => {
    await performMessageSend(message)
  }

  return (
    <Box
      className="Room"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ChatTranscript
        messageLog={messageLog}
        userId={userId}
        className="grow overflow-auto px-4"
      />
      <Divider />
      <MessageForm
        onMessageSubmit={handleMessageSubmit}
        isMessageSending={isMessageSending}
      />
    </Box>
  )
}
