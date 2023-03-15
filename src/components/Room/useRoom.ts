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
  InlineMedia,
  ReceivedInlineMedia,
  UnsentInlineMedia,
  VideoState,
  ScreenShareState,
  isMessageReceived,
  isInlineMedia,
  FileOfferMetadata,
} from 'models/chat'
import { getPeerName, usePeerNameDisplay } from 'components/PeerNameDisplay'
import { NotificationService } from 'services/Notification'
import { Audio as AudioService } from 'services/Audio'
import { PeerRoom, PeerHookType } from 'services/PeerRoom'
import { fileTransfer } from 'services/FileTransfer'

import { messageTranscriptSizeLimit } from 'config/messaging'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomConfig {
  roomId: string
  userId: string
  getUuid?: typeof uuid
}

interface UserMetadata {
  userId: string
  customUsername: string
}

export function useRoom(
  { password, ...roomConfig }: BaseRoomConfig & TorrentRoomConfig,
  { roomId, userId, getUuid = uuid }: UseRoomConfig
) {
  const isPrivate = password !== undefined

  const [peerRoom] = useState(
    () => new PeerRoom({ password: password ?? roomId, ...roomConfig }, roomId)
  )

  const {
    peerList,
    setPeerList,
    tabHasFocus,
    showAlert,
    setRoomId,
    setPassword,
    customUsername,
  } = useContext(ShellContext)

  const settingsContext = useContext(SettingsContext)
  const [isMessageSending, setIsMessageSending] = useState(false)
  const [messageLog, _setMessageLog] = useState<Array<Message | InlineMedia>>(
    []
  )
  const [newMessageAudio] = useState(
    () => new AudioService(process.env.PUBLIC_URL + '/sounds/new-message.aac')
  )

  const { getDisplayUsername } = usePeerNameDisplay()

  const setMessageLog = (messages: Array<Message | InlineMedia>) => {
    if (messages.length > messageTranscriptSizeLimit) {
      const evictedMessages = messages.slice(
        0,
        messages.length - messageTranscriptSizeLimit
      )

      for (const message of evictedMessages) {
        if (
          isInlineMedia(message) &&
          fileTransfer.isOffering(message.magnetURI)
        ) {
          fileTransfer.rescind(message.magnetURI)
        }
      }
    }

    _setMessageLog(messages.slice(-messageTranscriptSizeLimit))
  }

  const [isShowingMessages, setIsShowingMessages] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)

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

  const [peerOfferedFileMetadata, setPeerOfferedFileMetadata] = useState<
    Record<string, FileOfferMetadata>
  >({})

  const roomContextValue = useMemo(
    () => ({
      isPrivate,
      isMessageSending,
      isShowingMessages,
      setIsShowingMessages,
      unreadMessages,
      selfVideoStream,
      setSelfVideoStream,
      peerVideoStreams,
      setPeerVideoStreams,
      selfScreenStream,
      setSelfScreenStream,
      peerScreenStreams,
      setPeerScreenStreams,
      peerOfferedFileMetadata,
      setPeerOfferedFileMetadata,
    }),
    [
      isPrivate,
      isMessageSending,
      isShowingMessages,
      setIsShowingMessages,
      unreadMessages,
      selfVideoStream,
      setSelfVideoStream,
      peerVideoStreams,
      setPeerVideoStreams,
      selfScreenStream,
      setSelfScreenStream,
      peerScreenStreams,
      setPeerScreenStreams,
      peerOfferedFileMetadata,
      setPeerOfferedFileMetadata,
    ]
  )

  useEffect(() => {
    return () => {
      peerRoom.leaveRoom()
      setPeerList([])
    }
  }, [peerRoom, setPeerList])

  useEffect(() => {
    setPassword(password)

    return () => {
      setPassword(undefined)
    }
  }, [password, setPassword])

  useEffect(() => {
    setRoomId(roomId)

    return () => {
      setRoomId(undefined)
    }
  }, [roomId, setRoomId])

  useEffect(() => {
    if (isShowingMessages) setUnreadMessages(0)
  }, [isShowingMessages, setUnreadMessages])

  const [sendPeerMetadata, receivePeerMetadata] =
    usePeerRoomAction<UserMetadata>(peerRoom, PeerActions.PEER_METADATA)

  const [sendMessageTranscript, receiveMessageTranscript] = usePeerRoomAction<
    Array<ReceivedMessage | ReceivedInlineMedia>
  >(peerRoom, PeerActions.MESSAGE_TRANSCRIPT)

  const [sendPeerMessage, receivePeerMessage] =
    usePeerRoomAction<UnsentMessage>(peerRoom, PeerActions.MESSAGE)

  const [sendPeerInlineMedia, receivePeerInlineMedia] =
    usePeerRoomAction<UnsentInlineMedia>(peerRoom, PeerActions.MEDIA_MESSAGE)

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

  receivePeerMetadata(({ userId, customUsername }, peerId: string) => {
    const peerIndex = peerList.findIndex(peer => peer.peerId === peerId)

    if (peerIndex === -1) {
      setPeerList([
        ...peerList,
        {
          peerId,
          userId,
          customUsername,
          audioState: AudioState.STOPPED,
          videoState: VideoState.STOPPED,
          screenShareState: ScreenShareState.NOT_SHARING,
          offeredFileId: null,
        },
      ])
    } else {
      const oldUsername =
        peerList[peerIndex].customUsername || getPeerName(userId)
      const newUsername = customUsername || getPeerName(userId)

      const newPeerList = [...peerList]
      const newPeer = { ...newPeerList[peerIndex], userId, customUsername }
      newPeerList[peerIndex] = newPeer
      setPeerList(newPeerList)

      if (oldUsername !== newUsername) {
        showAlert(`${oldUsername} is now ${newUsername}`)
      }
    }
  })

  receiveMessageTranscript(transcript => {
    if (messageLog.length) return

    setMessageLog(transcript)
  })

  receivePeerMessage(message => {
    const userSettings = settingsContext.getUserSettings()

    if (!isShowingMessages) {
      setUnreadMessages(unreadMessages + 1)
    }

    if (!tabHasFocus || !isShowingMessages) {
      if (userSettings.playSoundOnNewMessage) {
        newMessageAudio.play()
      }

      if (userSettings.showNotificationOnNewMessage) {
        const displayUsername = getDisplayUsername(message.authorId)

        NotificationService.showNotification(
          `${displayUsername}: ${message.text}`
        )
      }
    }

    setMessageLog([...messageLog, { ...message, timeReceived: Date.now() }])
  })

  peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId: string) => {
    showAlert(`Someone has joined the room`, {
      severity: 'success',
    })
    ;(async () => {
      try {
        const promises: Promise<any>[] = [
          sendPeerMetadata({ userId, customUsername }, peerId),
        ]

        if (!isPrivate) {
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
        peerExist ? getDisplayUsername(peerList[peerIndex].userId) : 'Someone'
      } has left the room`,
      {
        severity: 'warning',
      }
    )

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

  if (!showVideoDisplay && !isShowingMessages) setIsShowingMessages(true)

  const handleInlineMediaUpload = async (files: File[]) => {
    const fileOfferId = await fileTransfer.offer(files, roomId)

    const unsentInlineMedia: UnsentInlineMedia = {
      authorId: userId,
      magnetURI: fileOfferId,
      timeSent: Date.now(),
      id: getUuid(),
    }

    setIsMessageSending(true)
    setMessageLog([...messageLog, unsentInlineMedia])

    await sendPeerInlineMedia(unsentInlineMedia)

    setMessageLog([
      ...messageLog,
      { ...unsentInlineMedia, timeReceived: Date.now() },
    ])
    setIsMessageSending(false)
  }

  receivePeerInlineMedia(inlineMedia => {
    const userSettings = settingsContext.getUserSettings()

    if (!tabHasFocus) {
      if (userSettings.playSoundOnNewMessage) {
        newMessageAudio.play()
      }

      if (userSettings.showNotificationOnNewMessage) {
        NotificationService.showNotification(
          `${getDisplayUsername(inlineMedia.authorId)} shared media`
        )
      }
    }

    setMessageLog([...messageLog, { ...inlineMedia, timeReceived: Date.now() }])
  })

  useEffect(() => {
    sendPeerMetadata({ customUsername, userId })
  }, [customUsername, userId, sendPeerMetadata])

  return {
    isPrivate,
    handleInlineMediaUpload,
    isMessageSending,
    messageLog,
    peerRoom,
    roomContextValue,
    sendMessage,
    showVideoDisplay,
  }
}
