import { useDebounce } from '@react-hook/debounce'
import { useContext, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'

import { getPeerName, usePeerNameDisplay } from 'components/PeerNameDisplay'
import { RoomContextProps } from 'contexts/RoomContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { usePeerAction } from 'hooks/usePeerAction'
import { Audio } from 'lib/Audio'
import {
  ActionNamespace,
  PeerHookType,
  PeerRoom,
  RoomConfig,
} from 'lib/PeerRoom'
import { time } from 'lib/Time'
import {
  AudioChannelName,
  AudioState,
  FileOfferMetadata,
  InlineMedia,
  isInlineMedia,
  isMessageReceived,
  Message,
  Peer,
  PeerVerificationState,
  ReceivedInlineMedia,
  ReceivedMessage,
  ScreenShareState,
  TypingStatus,
  UnsentInlineMedia,
  UnsentMessage,
  VideoState,
} from 'models/chat'
import { PeerAction } from 'models/network'
import { AllowedKeyType, encryption } from 'services/Encryption'
import { FileTransferService } from 'services/FileTransfer'
import { notification } from 'services/Notification'

import { messageTranscriptSizeLimit } from 'config/messaging'

import { usePeerVerification } from './usePeerVerification'

interface UseRoomConfig {
  roomId: string
  userId: string
  publicKey: CryptoKey
  getUuid?: typeof uuid
  encryptionService?: typeof encryption
  timeService?: typeof time
  targetPeerId?: string | null
}

interface UserMetadata extends Record<string, any> {
  userId: string
  customUsername: string
  publicKeyString: string
}

export function useRoom(
  { password, ...roomConfig }: RoomConfig,
  {
    roomId,
    userId,
    publicKey,
    targetPeerId = null,
    getUuid = uuid,
    encryptionService = encryption,
    timeService = time,
  }: UseRoomConfig
) {
  const isPrivate = password !== undefined

  const isDirectMessageRoom = typeof targetPeerId === 'string'
  const namespace = isDirectMessageRoom
    ? ActionNamespace.DIRECT_MESSAGE
    : ActionNamespace.GROUP

  const {
    peerList,
    setPeerList,
    setPeerConnectionTypes,
    tabHasFocus,
    showAlert,
    setRoomId,
    setPassword,
    customUsername,
    updatePeer,
    peerRoomRef,
    messageLog: shellMessageLog,
    setMessageLog: shellSetMessageLog,
  } = useContext(ShellContext)

  const messageLog = isDirectMessageRoom
    ? (shellMessageLog.directMessageLog[targetPeerId] ?? [])
    : shellMessageLog.groupMessageLog

  const [peerRoom] = useState(
    () =>
      peerRoomRef.current ??
      new PeerRoom({ password: password ?? roomId, ...roomConfig }, roomId)
  )

  peerRoomRef.current = peerRoom

  const settingsContext = useContext(SettingsContext)
  const { showActiveTypingStatus } = settingsContext.getUserSettings()
  const [isMessageSending, setIsMessageSending] = useState(false)

  const { selectedSound } = settingsContext.getUserSettings()
  const [newMessageAudio] = useState(() => new Audio(selectedSound))

  const { getDisplayUsername } = usePeerNameDisplay()

  const fileTransferService = useMemo(
    () => new FileTransferService(roomConfig.rtcConfig!),
    [roomConfig.rtcConfig]
  )

  const setMessageLog = (messages: Array<Message | InlineMedia>) => {
    if (messages.length > messageTranscriptSizeLimit) {
      const evictedMessages = messages.slice(
        0,
        messages.length - messageTranscriptSizeLimit
      )

      for (const message of evictedMessages) {
        if (
          isInlineMedia(message) &&
          fileTransferService.fileTransfer.isOffering(message.magnetURI)
        ) {
          fileTransferService.fileTransfer.rescind(message.magnetURI)
        }
      }
    }

    shellSetMessageLog(
      messages.slice(-messageTranscriptSizeLimit),
      targetPeerId
    )
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

  const roomContextValue: RoomContextProps = useMemo(
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
      fileTransferService,
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
      fileTransferService,
    ]
  )

  const [sendTypingStatusChange] = usePeerAction<TypingStatus>({
    namespace,
    peerAction: PeerAction.TYPING_STATUS_CHANGE,
    peerRoom,
    onReceive: (typingStatus, peerId) => {
      const { isTyping } = typingStatus

      updatePeer(peerId, {
        isTypingGroupMessage: isTyping && !isDirectMessageRoom,
        isTypingDirectMessage: isTyping && isDirectMessageRoom,
      })
    },
  })

  const [isTyping, setIsTypingDebounced, setIsTyping] = useDebounce(
    false,
    2000,
    true
  )

  useEffect(() => {
    if (!showActiveTypingStatus) return

    sendTypingStatusChange({ isTyping }, targetPeerId)
  }, [
    isDirectMessageRoom,
    isTyping,
    sendTypingStatusChange,
    showActiveTypingStatus,
    targetPeerId,
  ])

  useEffect(() => {
    return () => {
      if (isDirectMessageRoom) return

      sendTypingStatusChange({ isTyping: false }, targetPeerId)
      peerRoom.leaveRoom()
      peerRoomRef.current = null
      setPeerList([])
      shellSetMessageLog([], targetPeerId)
    }
  }, [
    peerRoom,
    setPeerList,
    sendTypingStatusChange,
    peerRoomRef,
    isDirectMessageRoom,
    shellSetMessageLog,
    targetPeerId,
  ])

  useEffect(() => {
    setPassword(password)

    return () => {
      setPassword(undefined)
    }
  }, [password, setPassword])

  useEffect(() => {
    if (isDirectMessageRoom) {
      return
    }

    setRoomId(roomId)

    return () => {
      setRoomId(undefined)
    }
  }, [roomId, setRoomId, isDirectMessageRoom])

  useEffect(() => {
    if (isShowingMessages) setUnreadMessages(0)
  }, [isShowingMessages, setUnreadMessages])

  const [sendPeerMetadata] = usePeerAction<UserMetadata>({
    namespace,
    peerAction: PeerAction.PEER_METADATA,
    peerRoom,
    onReceive: async (
      {
        userId: peerUserId,
        customUsername: peerCustomUsername,
        publicKeyString,
      },
      peerId: string
    ) => {
      const parsedPublicKey = await encryptionService.parseCryptoKeyString(
        publicKeyString,
        AllowedKeyType.PUBLIC
      )

      const peerIndex = peerList.findIndex(peer => peer.peerId === peerId)

      if (peerIndex === -1) {
        const newPeer: Peer = {
          peerId,
          userId: peerUserId,
          publicKey: parsedPublicKey,
          customUsername: peerCustomUsername,
          audioChannelState: {
            [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
            [AudioChannelName.SCREEN_SHARE]: AudioState.STOPPED,
          },
          videoState: VideoState.STOPPED,
          screenShareState: ScreenShareState.NOT_SHARING,
          offeredFileId: null,
          isTypingGroupMessage: false,
          isTypingDirectMessage: false,
          verificationToken: getUuid(),
          encryptedVerificationToken: new ArrayBuffer(0),
          verificationState: PeerVerificationState.VERIFYING,
          verificationTimer: null,
        }

        setPeerList(prev => [...prev, newPeer])
        sendTypingStatusChange({ isTyping }, peerId)
        verifyPeer(newPeer)
      } else {
        const oldUsername =
          peerList[peerIndex].customUsername || getPeerName(peerUserId)
        const newUsername = peerCustomUsername || getPeerName(peerUserId)

        setPeerList(prev => {
          const newPeerList = [...prev]
          const newPeer = {
            ...newPeerList[peerIndex],
            userId: peerUserId,
            customUsername: peerCustomUsername,
          }
          newPeerList[peerIndex] = newPeer

          return newPeerList
        })

        if (oldUsername !== newUsername) {
          showAlert(`${oldUsername} is now ${newUsername}`)
        }
      }
    },
  })

  const [sendMessageTranscript] = usePeerAction<
    Array<ReceivedMessage | ReceivedInlineMedia>
  >({
    namespace,
    peerAction: PeerAction.MESSAGE_TRANSCRIPT,
    peerRoom,
    onReceive: transcript => {
      if (messageLog.length) return

      setMessageLog(transcript)
    },
  })

  const [sendPeerMessage] = usePeerAction<UnsentMessage>({
    namespace,
    peerAction: PeerAction.MESSAGE,
    peerRoom,
    onReceive: (message, peerId) => {
      if (isDirectMessageRoom && peerId !== targetPeerId) {
        return
      }

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

          notification.showNotification(`${displayUsername}: ${message.text}`)
        }
      }

      setMessageLog([
        ...messageLog,
        { ...message, timeReceived: timeService.now() },
      ])
      updatePeer(peerId, { isTypingGroupMessage: false })
    },
  })

  const [sendPeerInlineMedia] = usePeerAction<UnsentInlineMedia>({
    namespace,
    peerAction: PeerAction.MEDIA_MESSAGE,
    peerRoom,
    onReceive: inlineMedia => {
      const userSettings = settingsContext.getUserSettings()

      if (!tabHasFocus) {
        if (userSettings.playSoundOnNewMessage) {
          newMessageAudio.play()
        }

        if (userSettings.showNotificationOnNewMessage) {
          notification.showNotification(
            `${getDisplayUsername(inlineMedia.authorId)} shared media`
          )
        }
      }

      setMessageLog([
        ...messageLog,
        { ...inlineMedia, timeReceived: timeService.now() },
      ])
    },
  })

  const { privateKey } = settingsContext.getUserSettings()

  const { verifyPeer } = usePeerVerification({
    peerRoom,
    privateKey,
    encryptionService,
    isDirectMessageRoom,
  })

  const sendMessage = async (message: string) => {
    if (isMessageSending) return

    const unsentMessage: UnsentMessage = {
      authorId: userId,
      text: message,
      timeSent: timeService.now(),
      id: getUuid(),
    }

    setIsTyping(false)
    setIsMessageSending(true)
    setMessageLog([...messageLog, unsentMessage])

    await sendPeerMessage(unsentMessage, targetPeerId)

    setMessageLog([
      ...messageLog,
      { ...unsentMessage, timeReceived: timeService.now() },
    ])
    setIsMessageSending(false)
  }

  if (!isDirectMessageRoom) {
    peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId: string) => {
      showAlert(`Someone has joined the room`, {
        severity: 'success',
      })
      ;(async () => {
        try {
          const publicKeyString =
            await encryptionService.stringifyCryptoKey(publicKey)

          const promises: Promise<any>[] = [
            sendPeerMetadata(
              { userId, customUsername, publicKeyString },
              peerId
            ),
          ]

          if (!isPrivate) {
            promises.push(
              sendMessageTranscript(
                messageLog.filter(isMessageReceived),
                peerId
              )
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
      const doesPeerExist = peerIndex !== -1

      showAlert(
        `${
          doesPeerExist
            ? getDisplayUsername(peerList[peerIndex].userId)
            : 'Someone'
        } has left the room`,
        {
          severity: 'warning',
        }
      )

      if (doesPeerExist) {
        setPeerList(prev => {
          const peerListClone = [...prev]
          peerListClone.splice(peerIndex, 1)

          return peerListClone
        })
      }
    })
  }

  const showVideoDisplay = Boolean(
    selfVideoStream ||
      selfScreenStream ||
      Object.values({ ...peerVideoStreams, ...peerScreenStreams }).length > 0
  )

  if (!showVideoDisplay && !isShowingMessages) setIsShowingMessages(true)

  const handleInlineMediaUpload = async (files: File[]) => {
    const fileOfferId = await fileTransferService.fileTransfer.offer(
      files,
      roomId
    )

    const unsentInlineMedia: UnsentInlineMedia = {
      authorId: userId,
      magnetURI: fileOfferId,
      timeSent: timeService.now(),
      id: getUuid(),
    }

    setIsMessageSending(true)
    setMessageLog([...messageLog, unsentInlineMedia])

    await sendPeerInlineMedia(unsentInlineMedia)

    setMessageLog([
      ...messageLog,
      { ...unsentInlineMedia, timeReceived: timeService.now() },
    ])
    setIsMessageSending(false)
  }

  const handleMessageChange = () => {
    if (isTyping) {
      setIsTypingDebounced(true)
    } else {
      setIsTyping(true)
    }

    // This queues up the expiration of the typing state. It is effectively
    // cancelled once this message change handler is called again.
    setIsTypingDebounced(false)
  }

  useEffect(() => {
    ;(async () => {
      if (isDirectMessageRoom) return

      const publicKeyString =
        await encryptionService.stringifyCryptoKey(publicKey)

      sendPeerMetadata({
        customUsername,
        userId,
        publicKeyString,
      })
    })()
  }, [
    customUsername,
    userId,
    sendPeerMetadata,
    publicKey,
    encryptionService,
    isDirectMessageRoom,
  ])

  useEffect(() => {
    ;(async () => {
      setPeerConnectionTypes(await peerRoom.getPeerConnectionTypes())
    })()
  }, [peerList, peerRoom, setPeerConnectionTypes])

  return {
    isDirectMessageRoom,
    isPrivate,
    handleInlineMediaUpload,
    handleMessageChange,
    isMessageSending,
    messageLog,
    peerRoom,
    roomContextValue,
    sendMessage,
    showVideoDisplay,
  }
}
