import { useContext, useEffect, useCallback, useState } from 'react'

import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { AudioState, Peer } from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'services/PeerRoom'

import { usePeerRoomAction } from './usePeerRoomAction'

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

  const { peerList, setPeerList, setAudioState, peerAudios, setPeerAudios } =
    shellContext

  useEffect(() => {
    ;(async () => {
      if (!audioStream) return

      const devices = await window.navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(({ kind }) => kind === 'audioinput')
      setAudioDevices(audioDevices)
    })()
  }, [audioStream])

  const [sendAudioChange, receiveAudioChange] = usePeerRoomAction<AudioState>(
    peerRoom,
    PeerActions.AUDIO_CHANGE
  )

  receiveAudioChange((audioState, peerId) => {
    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.audioState = audioState

        if (audioState === AudioState.STOPPED) {
          deletePeerAudio(peerId)
        }
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  peerRoom.onPeerStream(PeerStreamType.AUDIO, (stream, peerId) => {
    const audioTracks = stream.getAudioTracks()

    if (audioTracks.length === 0) return

    const audio = new Audio()
    audio.srcObject = stream
    audio.autoplay = true

    setPeerAudios({ ...peerAudios, [peerId]: audio })
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

          peerRoom.addStream(newSelfStream)
          sendAudioChange(AudioState.PLAYING)
          setAudioState(AudioState.PLAYING)
          setAudioStream(newSelfStream)
        }
      } else {
        if (audioStream) {
          cleanupAudio()

          peerRoom.removeStream(audioStream, peerRoom.getPeers())
          sendAudioChange(AudioState.STOPPED)
          setAudioState(AudioState.STOPPED)
          setAudioStream(null)
        }
      }
    })()
  }, [
    audioStream,
    cleanupAudio,
    isSpeakingToRoom,
    peerAudios,
    peerRoom,
    selectedAudioDeviceId,
    sendAudioChange,
    setAudioState,
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

    peerRoom.addStream(newSelfStream)
    setAudioStream(newSelfStream)
  }

  const deletePeerAudio = (peerId: string) => {
    const newPeerAudios = { ...peerAudios }
    delete newPeerAudios[peerId]
    setPeerAudios(newPeerAudios)
  }

  const handleAudioForNewPeer = (peerId: string) => {
    if (audioStream) {
      peerRoom.addStream(audioStream, peerId)
    }
  }

  const handleAudioForLeavingPeer = (peerId: string) => {
    if (audioStream) {
      peerRoom.removeStream(audioStream, peerId)
      deletePeerAudio(peerId)
    }
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
