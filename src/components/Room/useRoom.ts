import { useContext, useEffect, useMemo, useState } from 'react'
import { BaseRoomConfig } from 'trystero'
import { TorrentRoomConfig } from 'trystero/torrent'
import { v4 as uuid } from 'uuid'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { PeerActions } from 'models/network'
import {
  AudioState,
  Message,
  ReceivedMessage,
  UnsentMessage,
  VideoState,
  ScreenShareState,
  isMessageReceived,
} from 'models/chat'
import { getPeerName } from 'components/PeerNameDisplay'
import { NotificationService } from 'services/Notification'
import { Audio as AudioService } from 'services/Audio'
import { PeerRoom, PeerHookType } from 'services/PeerRoom'

import { messageTranscriptSizeLimit } from 'config/messaging'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomConfig {
  roomId: string
  userId: string
  getUuid?: typeof uuid
}

export function useRoom(
  { password, ...roomConfig }: BaseRoomConfig & TorrentRoomConfig,
  { roomId, userId, getUuid = uuid }: UseRoomConfig
) {
  const isPublicRoom = !password

  const [peerRoom] = useState(
    () => new PeerRoom({ password: password ?? roomId, ...roomConfig }, roomId)
  )

  const [numberOfPeers, setNumberOfPeers] = useState(1) // Includes this peer
  const {
    setDoShowPeers,
    peerList,
    setPeerList,
    tabHasFocus,
    showAlert,
    setIsPeerListOpen,
  } = useContext(ShellContext)
  const settingsContext = useContext(SettingsContext)
  const [isMessageSending, setIsMessageSending] = useState(false)
  const [messageLog, _setMessageLog] = useState<
    Array<ReceivedMessage | UnsentMessage>
  >([])
  const [newMessageAudio] = useState(
    () => new AudioService(process.env.PUBLIC_URL + '/sounds/new-message.aac')
  )

  const setMessageLog = (messages: Message[]) => {
    _setMessageLog(messages.slice(-messageTranscriptSizeLimit))
  }

  const [selfVideoStream, setSelfVideoStream] = useState<MediaStream | null>(
    null
  )
  const [peerVideoStreams, setPeerVideoStreams] = useState<
    Record<string, MediaStream>
  >({})

  const [selfScreenStream, setSelfScreenStream] = useState<MediaStream | null>(
    null
  )
  const [peerScreenStreams, setPeerScreenStreams] = useState<
    Record<string, MediaStream>
  >({})

  const [peerOfferedFileIds, setPeerOfferedFileIds] = useState<
    Record<string, string>
  >({})

  const roomContextValue = useMemo(
    () => ({
      selfVideoStream,
      setSelfVideoStream,
      peerVideoStreams,
      setPeerVideoStreams,
      selfScreenStream,
      setSelfScreenStream,
      peerScreenStreams,
      setPeerScreenStreams,
      peerOfferedFileIds,
      setPeerOfferedFileIds,
    }),
    [
      selfVideoStream,
      setSelfVideoStream,
      peerVideoStreams,
      setPeerVideoStreams,
      selfScreenStream,
      setSelfScreenStream,
      peerScreenStreams,
      setPeerScreenStreams,
      peerOfferedFileIds,
      setPeerOfferedFileIds,
    ]
  )

  useEffect(() => {
    return () => {
      peerRoom.leaveRoom()
      setIsPeerListOpen(false)
    }
  }, [peerRoom, setIsPeerListOpen])

  useEffect(() => {
    setDoShowPeers(true)

    return () => {
      setDoShowPeers(false)
    }
  }, [setDoShowPeers])

  const [sendPeerId, receivePeerId] = usePeerRoomAction<string>(
    peerRoom,
    PeerActions.PEER_NAME
  )

  const [sendMessageTranscript, receiveMessageTranscript] = usePeerRoomAction<
    ReceivedMessage[]
  >(peerRoom, PeerActions.MESSAGE_TRANSCRIPT)

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
    const peerIndex = peerList.findIndex(peer => peer.peerId === peerId)
    if (peerIndex === -1) {
      setPeerList([
        ...peerList,
        {
          peerId,
          userId,
          audioState: AudioState.STOPPED,
          videoState: VideoState.STOPPED,
          screenShareState: ScreenShareState.NOT_SHARING,
          offeredFileId: null,
        },
      ])
    } else {
      const newPeerList = [...peerList]
      newPeerList[peerIndex].userId = userId
      setPeerList(newPeerList)
    }
  })

  receiveMessageTranscript(transcript => {
    if (messageLog.length) return

    setMessageLog(transcript)
  })

  receivePeerMessage(message => {
    const userSettings = settingsContext.getUserSettings()

    if (!tabHasFocus) {
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

  peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId: string) => {
    showAlert(`Someone has joined the room`, {
      severity: 'success',
    })

    const newNumberOfPeers = numberOfPeers + 1
    setNumberOfPeers(newNumberOfPeers)
    setNumberOfPeers(newNumberOfPeers)
    ;(async () => {
      try {
        const promises: Promise<any>[] = [sendPeerId(userId, peerId)]

        if (isPublicRoom) {
          promises.push(
            sendMessageTranscript(messageLog.filter(isMessageReceived), peerId)
          )
        }

        await Promise.all(promises)
      } catch (e) {
        console.error(e)
      }
    })()
  })

  peerRoom.onPeerLeave(PeerHookType.NEW_PEER, (peerId: string) => {
    const peerIndex = peerList.findIndex(peer => peer.peerId === peerId)
    const peerExist = peerIndex !== -1
    showAlert(
      `${
        peerExist ? getPeerName(peerList[peerIndex].userId) : 'Someone'
      } has left the room`,
      {
        severity: 'warning',
      }
    )

    const newNumberOfPeers = numberOfPeers - 1
    setNumberOfPeers(newNumberOfPeers)
    setNumberOfPeers(newNumberOfPeers)

    if (peerExist) {
      const peerListClone = [...peerList]
      peerListClone.splice(peerIndex, 1)
      setPeerList(peerListClone)
    }
  })

  const showVideoDisplay = Boolean(
    selfVideoStream ||
      selfScreenStream ||
      Object.values({ ...peerVideoStreams, ...peerScreenStreams }).length > 0
  )

  const handleInlineMediaUpload = (files: File[]) => {
    console.log({ files })
  }

  return {
    handleInlineMediaUpload,
    isMessageSending,
    messageLog,
    peerRoom,
    roomContextValue,
    sendMessage,
    showVideoDisplay,
  }
}
