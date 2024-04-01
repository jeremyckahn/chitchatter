import { useContext, useEffect, useCallback, useState } from 'react'

import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import {
  AudioState,
  Peer,
  AudioChannelName,
  PeerAudioChannelState,
  doesPeerHaveAudioChannel,
  AudioStreamType,
} from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'lib/PeerRoom'

interface UseRoomAudioConfig {
  peerRoom: PeerRoom
}

export function useRoomAudio({ peerRoom }: UseRoomAudioConfig) {
  const shellContext = useContext(ShellContext)
  const [isSpeakingToRoom, setIsSpeakingToRoom] = useState(false)
  const [audioStream, setAudioStream] = useState<MediaStream | null>()

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<
    string | null
  >(null)

  const { peerList, setPeerList, setAudioChannelState, setPeerAudios } =
    shellContext

  useEffect(() => {
    ;(async () => {
      if (!audioStream) return

      const devices = await window.navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(({ kind }) => kind === 'audioinput')
      setAudioDevices(audioDevices)
    })()
  }, [audioStream])

  const [sendAudioChange, receiveAudioChange] = peerRoom.makeAction<
    Partial<PeerAudioChannelState>
  >(PeerActions.AUDIO_CHANGE)

  receiveAudioChange((peerAudioChannelState, peerId) => {
    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      for (const channel of Object.keys(peerAudioChannelState)) {
        if (!doesPeerHaveAudioChannel(newPeer, channel)) {
          continue
        }

        if (peer.peerId === peerId) {
          newPeer.audioChannelState = {
            ...newPeer.audioChannelState,
            ...peerAudioChannelState,
          }

          if (peerAudioChannelState[channel] === AudioState.STOPPED) {
            deletePeerAudio(peerId)
          }
        }
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  peerRoom.onPeerStream(PeerStreamType.AUDIO, (stream, peerId, metadata) => {
    if (
      typeof metadata === 'object' &&
      metadata !== null &&
      'type' in metadata &&
      metadata.type !== AudioStreamType.MICROPHONE
    ) {
      return
    }

    const audioTracks = stream.getAudioTracks()

    if (audioTracks.length === 0) return

    const audio = new Audio()
    audio.srcObject = stream
    audio.autoplay = true

    setPeerAudios(peerAudios => ({
      ...peerAudios,
      [peerId]: {
        ...peerAudios[peerId],
        [AudioChannelName.MICROPHONE]: audio,
      },
    }))
  })

  const cleanupAudio = useCallback(() => {
    if (!audioStream) return

    for (const audioTrack of audioStream.getTracks()) {
      audioTrack.stop()
      audioStream.removeTrack(audioTrack)
    }
  }, [audioStream])

  useEffect(() => {
    ;(async () => {
      if (isSpeakingToRoom) {
        if (!audioStream) {
          const newSelfStream = await navigator.mediaDevices.getUserMedia({
            audio: selectedAudioDeviceId
              ? { deviceId: selectedAudioDeviceId }
              : true,
            video: false,
          })

          peerRoom.addStream(newSelfStream, null, {
            type: AudioStreamType.MICROPHONE,
          })

          sendAudioChange({
            [AudioChannelName.MICROPHONE]: AudioState.PLAYING,
          })

          setAudioChannelState(prevState => ({
            ...prevState,
            [AudioChannelName.MICROPHONE]: AudioState.PLAYING,
          }))

          setAudioStream(newSelfStream)
        }
      } else {
        if (audioStream) {
          cleanupAudio()

          peerRoom.removeStream(audioStream, peerRoom.getPeers())

          sendAudioChange({
            [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
          })

          setAudioChannelState(prevState => ({
            ...prevState,
            [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
          }))

          setAudioStream(null)
        }
      }
    })()
  }, [
    audioStream,
    cleanupAudio,
    isSpeakingToRoom,
    peerRoom,
    selectedAudioDeviceId,
    sendAudioChange,
    setAudioChannelState,
  ])

  useEffect(() => {
    return () => {
      cleanupAudio()
    }
  }, [cleanupAudio])

  const handleAudioDeviceSelect = async (audioDevice: MediaDeviceInfo) => {
    const { deviceId } = audioDevice
    setSelectedAudioDeviceId(deviceId)

    if (!audioStream) return

    for (const audioTrack of audioStream.getTracks()) {
      audioTrack.stop()
      audioStream.removeTrack(audioTrack)
    }

    peerRoom.removeStream(audioStream, peerRoom.getPeers())

    const newSelfStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId,
      },
      video: false,
    })

    peerRoom.addStream(newSelfStream, null, {
      type: AudioStreamType.MICROPHONE,
    })

    setAudioStream(newSelfStream)
  }

  const deletePeerAudio = (peerId: string) => {
    setPeerAudios(({ ...newPeerAudios }) => {
      if (!newPeerAudios[peerId]) {
        return newPeerAudios
      }

      const microphoneAudio = newPeerAudios[peerId][AudioChannelName.MICROPHONE]
      microphoneAudio?.pause()

      const { [AudioChannelName.MICROPHONE]: _, ...newPeerAudioChannels } =
        newPeerAudios[peerId]

      newPeerAudios[peerId] = newPeerAudioChannels

      return newPeerAudios
    })
  }

  const handleAudioForNewPeer = (peerId: string) => {
    if (audioStream) {
      peerRoom.addStream(audioStream, peerId, {
        type: AudioStreamType.MICROPHONE,
      })
    }
  }

  const handleAudioForLeavingPeer = (peerId: string) => {
    if (audioStream) {
      peerRoom.removeStream(audioStream, peerId)
    }

    deletePeerAudio(peerId)
  }

  peerRoom.onPeerJoin(PeerHookType.AUDIO, (peerId: string) => {
    handleAudioForNewPeer(peerId)
  })

  peerRoom.onPeerLeave(PeerHookType.AUDIO, (peerId: string) => {
    handleAudioForLeavingPeer(peerId)
  })

  return {
    audioDevices,
    isSpeakingToRoom,
    setIsSpeakingToRoom,
    handleAudioDeviceSelect,
  }
}
