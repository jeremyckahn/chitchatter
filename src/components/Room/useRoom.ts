import { useContext, useEffect, useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'

import { createWebAdapters } from 'adapters/web'
import { ChatRoom } from 'core/chat/ChatRoom'
import { FileHandle } from 'core/chat/fileOffers'
import { encryption } from 'core/crypto/Encryption'
import { FileOfferMetadata } from 'core/models/chat'
import { RoomConfig, TrysteroTransport } from 'core/transport/TrysteroTransport'
import { RoomContextProps } from 'contexts/RoomContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import {
  useChatRoomIsMessageSending,
  useChatRoomMessageLog,
  useChatRoomPeers,
} from 'hooks/useChatRoomState'
import { time } from 'core/lib/Time'
import { FileTransferService } from 'services/FileTransfer'

import { useChatRoomNotifications } from './useChatRoomNotifications'

interface UseRoomConfig {
  roomId: string
  userId: string
  publicKey: CryptoKey
  getUuid?: typeof uuid
  encryptionService?: typeof encryption
  timeService?: typeof time
  targetPeerId?: string | null
}

/**
 * Binds a {@link ChatRoom} to the React tree.
 *
 * All of the chat protocol lives in the core now; this hook's job is to build
 * the instance with web adapters, keep the component tree subscribed to it, and
 * hand the presentation concerns to `useChatRoomNotifications`.
 */
export const useRoom = (
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
) => {
  const {
    setRoomId,
    setPassword,
    customUsername,
    transportRef,
    registerChatRoom,
    chatRoomRegistry,
  } = useContext(ShellContext)

  const settingsContext = useContext(SettingsContext)
  const { privateKey, selectedSound } = settingsContext.getUserSettings()

  const isDirectMessageRoom = typeof targetPeerId === 'string'

  const fileTransferService = useMemo(
    () => new FileTransferService(roomConfig.rtcConfig!),
    [roomConfig.rtcConfig]
  )

  // A direct-message room rides the group room's existing transport under a
  // separate action namespace, rather than joining the room a second time.
  const [transport] = useState(
    () =>
      transportRef.current ??
      new TrysteroTransport(
        { password: password ?? roomId, ...roomConfig },
        roomId
      )
  )

  transportRef.current = transport

  const [chatRoom] = useState(() => {
    // A direct-message conversation outlives the dialog that shows it, so it is
    // taken from the registry when one already exists. This is what keeps a DM
    // transcript intact across closing and reopening the dialog.
    const existing =
      isDirectMessageRoom && targetPeerId
        ? chatRoomRegistry.getDirect(targetPeerId)
        : null

    if (existing) return existing

    const created = new ChatRoom({
      roomId,
      userId,
      customUsername,
      publicKey,
      privateKey,
      transport,
      password,
      targetPeerId,
      encryptionService,
      adapters: createWebAdapters({
        selectedSound,
        fileTransferService,
        getUuid,
        timeService,
      }),
    })

    if (isDirectMessageRoom && targetPeerId) {
      chatRoomRegistry.setDirect(targetPeerId, created)
    }

    return created
  })

  const messageLog = useChatRoomMessageLog(chatRoom)
  const isMessageSending = useChatRoomIsMessageSending(chatRoom)
  const peerList = useChatRoomPeers(chatRoom)

  const [isShowingMessages, setIsShowingMessages] = useState(true)

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

  const showVideoDisplay = Boolean(
    selfVideoStream ||
      selfScreenStream ||
      Object.values({ ...peerVideoStreams, ...peerScreenStreams }).length > 0
  )

  // Derived, not stored: there is nothing to show but messages when no video is
  // on screen. The previous implementation set state during render to do this.
  const isShowingMessagesResolved = showVideoDisplay ? isShowingMessages : true

  // The stored flag is reset too, so that hiding the transcript during one call
  // does not silently hide it again at the start of the next one — the control
  // that would unhide it is not even on screen in between.
  useEffect(() => {
    if (!showVideoDisplay) setIsShowingMessages(true)
  }, [showVideoDisplay])

  // Given the resolved value, not the stored one: a transcript that is on
  // screen and focused should not also announce itself with a sound or a
  // desktop notification.
  const { unreadMessages } = useChatRoomNotifications(chatRoom, {
    isShowingMessages: isShowingMessagesResolved,
  })

  useEffect(() => {
    // join() is idempotent, so a reused direct-message room is left alone.
    void chatRoom.join()
  }, [chatRoom])

  useEffect(() => {
    // Only the group room owns the transport's lifetime. A direct-message room
    // shares it and stays joined until the group room goes away, which is what
    // the registry cleanup below takes care of.
    if (isDirectMessageRoom) return

    registerChatRoom(chatRoom)

    return () => {
      registerChatRoom(null)

      void (async () => {
        await chatRoomRegistry.clearDirect()
        await chatRoom.leave()
        transport.leaveRoom()
        transportRef.current = null
      })()
    }
  }, [
    chatRoom,
    chatRoomRegistry,
    isDirectMessageRoom,
    registerChatRoom,
    transport,
    transportRef,
  ])

  useEffect(() => {
    if (isDirectMessageRoom) return

    void chatRoom.setCustomUsername(customUsername)
  }, [chatRoom, customUsername, isDirectMessageRoom])

  // Reclassify connections whenever the roster changes, so the peer list's
  // direct-vs-relay indicator stays current.
  useEffect(() => {
    void chatRoom.refreshConnectionTypes()
  }, [chatRoom, peerList])

  useEffect(() => {
    setPassword(password)

    return () => {
      setPassword(undefined)
    }
  }, [password, setPassword])

  useEffect(() => {
    if (isDirectMessageRoom) return

    setRoomId(roomId)

    return () => {
      setRoomId(undefined)
    }
  }, [roomId, setRoomId, isDirectMessageRoom])

  const roomContextValue: RoomContextProps = useMemo(
    () => ({
      isPrivate: chatRoom.isPrivate,
      isMessageSending,
      isShowingMessages: isShowingMessagesResolved,
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
      chatRoom,
      isMessageSending,
      isShowingMessagesResolved,
      unreadMessages,
      selfVideoStream,
      peerVideoStreams,
      selfScreenStream,
      peerScreenStreams,
      peerOfferedFileMetadata,
      fileTransferService,
    ]
  )

  const sendMessage = (message: string) => chatRoom.sendMessage(message)

  const handleInlineMediaUpload = (files: FileHandle[]) =>
    chatRoom.sendInlineMedia(files)

  const handleMessageChange = () => {
    if (!settingsContext.getUserSettings().showActiveTypingStatus) return

    chatRoom.notifyTyping()
  }

  return {
    chatRoom,
    isDirectMessageRoom,
    isPrivate: chatRoom.isPrivate,
    handleInlineMediaUpload,
    handleMessageChange,
    isMessageSending,
    messageLog,
    peerRoom: transport,
    roomContextValue,
    sendMessage,
    showVideoDisplay,
  }
}
