import { useContext, useEffect, useState } from 'react'
import { BaseRoomConfig } from 'trystero'
import { TorrentRoomConfig } from 'trystero/torrent'
import { v4 as uuid } from 'uuid'

import { ShellContext } from 'contexts/ShellContext'
import { SettingsContext } from 'contexts/SettingsContext'
import { PeerActions } from 'models/network'
import {
  Message,
  ReceivedMessage,
  UnsentMessage,
  isMessageReceived,
} from 'models/chat'
import { funAnimalName } from 'fun-animal-names'
import { getPeerName } from 'components/PeerNameDisplay'
import { NotificationService } from 'services/Notification'
import { Audio as AudioService } from 'services/Audio'
import { PeerRoom } from 'services/PeerRoom'

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
  const shellContext = useContext(ShellContext)
  const settingsContext = useContext(SettingsContext)
  const [isMessageSending, setIsMessageSending] = useState(false)
  const [messageLog, _setMessageLog] = useState<
    Array<ReceivedMessage | UnsentMessage>
  >([])
  const [newMessageAudio] = useState(
    () => new AudioService(process.env.PUBLIC_URL + '/sounds/new-message.aac')
  )
  const [isSpeakingToRoom, setIsSpeakingToRoom] = useState(false)
  const [peerAudios, setPeerAudios] = useState<
    Record<string, HTMLAudioElement>
  >({})
  const [audioStream, setAudioStream] = useState<MediaStream | null>()

  const setMessageLog = (messages: Message[]) => {
    _setMessageLog(messages.slice(-messageTranscriptSizeLimit))
  }
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])

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

  useEffect(() => {
    ;(async () => {
      if (!audioStream) return

      const devices = await window.navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(({ kind }) => kind === 'audioinput')
      setAudioDevices(audioDevices)
    })()
  }, [audioStream])

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

  receiveMessageTranscript(transcript => {
    if (messageLog.length) return

    setMessageLog(transcript)
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

    if (audioStream) {
      peerRoom.addStream(audioStream, peerId)
    }

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

    if (audioStream) {
      peerRoom.removeStream(audioStream, peerId)
    }

    if (peerExist) {
      const peerListClone = [...shellContext.peerList]
      peerListClone.splice(peerIndex, 1)
      shellContext.setPeerList(peerListClone)
    }
  })

  peerRoom.onPeerStream((stream, peerId) => {
    const audio = new Audio()
    audio.srcObject = stream
    audio.autoplay = true

    setPeerAudios({ ...peerAudios, [peerId]: audio })
  })

  useEffect(() => {
    ;(async () => {
      if (isSpeakingToRoom) {
        if (!audioStream) {
          const newSelfStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          })

          peerRoom.addStream(newSelfStream)

          setAudioStream(newSelfStream)
        }
      } else {
        if (audioStream) {
          for (const audioTrack of audioStream.getTracks()) {
            audioTrack.stop()
            audioStream.removeTrack(audioTrack)
          }

          peerRoom.removeStream(audioStream, peerRoom.getPeers())
          setAudioStream(null)
        }
      }
    })()
  }, [isSpeakingToRoom, peerAudios, peerRoom, audioStream])

  const handleAudioDeviceSelect = async (audioDevice: MediaDeviceInfo) => {
    if (!audioStream) return

    for (const audioTrack of audioStream.getTracks()) {
      audioTrack.stop()
      audioStream.removeTrack(audioTrack)
    }

    peerRoom.removeStream(audioStream, peerRoom.getPeers())

    const newSelfStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: audioDevice.deviceId,
      },
      video: false,
    })

    peerRoom.addStream(newSelfStream)
    setAudioStream(newSelfStream)
  }

  return {
    audioDevices,
    peerRoom,
    messageLog,
    sendMessage,
    isMessageSending,
    isSpeakingToRoom,
    setIsSpeakingToRoom,
    handleAudioDeviceSelect,
  }
}
