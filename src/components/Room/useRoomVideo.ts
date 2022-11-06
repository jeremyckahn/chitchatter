import { useContext, useEffect, useCallback, useState } from 'react'

import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { VideoState, Peer } from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'services/PeerRoom'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomVideoConfig {
  peerRoom: PeerRoom
}

export function useRoomVideo({ peerRoom }: UseRoomVideoConfig) {
  const shellContext = useContext(ShellContext)
  const [isSpeakingToRoom, setIsSpeakingToRoom] = useState(false)
  const [videoStream, setVideoStream] = useState<MediaStream | null>()

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<
    string | null
  >(null)

  useEffect(() => {
    ;(async () => {
      if (!videoStream) return

      const devices = await window.navigator.mediaDevices.enumerateDevices()
      const rawVideoDevices = devices.filter(
        ({ kind }) => kind === 'videoinput'
      )

      // Sometimes duplicate devices are provided by enumerateDevices, so
      // dedupe them by ID.
      const newVideoDevices = [
        ...rawVideoDevices
          .reduce((acc, videoDevice) => {
            return acc.set(videoDevice.deviceId, videoDevice)
          }, new Map<string, MediaDeviceInfo>())
          .values(),
      ]

      setVideoDevices(newVideoDevices)

      if (newVideoDevices.length > 0 && !shellContext.selfVideoStream) {
        const [firstVideoDevice] = newVideoDevices
        const newSelfStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: firstVideoDevice.deviceId,
          },
        })

        peerRoom.addStream(newSelfStream)
        setVideoStream(newSelfStream)

        shellContext.setSelfVideoStream(newSelfStream)
      }
    })()
  }, [peerRoom, shellContext, videoStream])

  const [sendVideoChange, receiveVideoChange] = usePeerRoomAction<VideoState>(
    peerRoom,
    PeerActions.VIDEO_CHANGE
  )

  receiveVideoChange((videoState, peerId) => {
    const newPeerList = shellContext.peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.videoState = videoState

        if (videoState === VideoState.STOPPED) {
          deletePeerVideo(peerId)
        }
      }

      return newPeer
    })

    shellContext.setPeerList(newPeerList)
  })

  peerRoom.onPeerStream(PeerStreamType.VIDEO, (stream, peerId) => {
    const videoTracks = stream.getVideoTracks()

    if (videoTracks.length === 0) return

    shellContext.setPeerVideoStreams({
      ...shellContext.peerVideoStreams,
      [peerId]: stream,
    })
  })

  const cleanupVideo = useCallback(() => {
    if (!videoStream) return

    for (const videoTrack of videoStream.getTracks()) {
      videoTrack.stop()
      videoStream.removeTrack(videoTrack)
    }
  }, [videoStream])

  useEffect(() => {
    ;(async () => {
      if (isSpeakingToRoom) {
        if (!videoStream) {
          const newSelfStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: selectedVideoDeviceId
              ? { deviceId: selectedVideoDeviceId }
              : true,
          })

          peerRoom.addStream(newSelfStream)
          sendVideoChange(VideoState.PLAYING)
          shellContext.setVideoState(VideoState.PLAYING)
          setVideoStream(newSelfStream)
        }
      } else {
        if (videoStream) {
          cleanupVideo()

          peerRoom.removeStream(videoStream, peerRoom.getPeers())
          sendVideoChange(VideoState.STOPPED)
          shellContext.setVideoState(VideoState.STOPPED)
          setVideoStream(null)
          shellContext.setSelfVideoStream(null)
        }
      }
    })()
  }, [
    isSpeakingToRoom,
    peerRoom,
    videoStream,
    selectedVideoDeviceId,
    sendVideoChange,
    shellContext,
    cleanupVideo,
  ])

  useEffect(() => {
    return () => {
      cleanupVideo()
    }
  }, [cleanupVideo])

  const {
    selfVideoStream,
    setSelfVideoStream,
    setVideoState,
    setPeerVideoStreams,
  } = shellContext

  useEffect(() => {
    return () => {
      if (selfVideoStream) {
        setSelfVideoStream(null)
        setVideoState(VideoState.STOPPED)
      }

      setPeerVideoStreams({})
    }
  }, [selfVideoStream, setSelfVideoStream, setVideoState, setPeerVideoStreams])

  const handleVideoDeviceSelect = async (videoDevice: MediaDeviceInfo) => {
    const { deviceId } = videoDevice
    setSelectedVideoDeviceId(deviceId)

    if (!videoStream) return

    for (const videoTrack of videoStream.getTracks()) {
      videoTrack.stop()
      videoStream.removeTrack(videoTrack)
    }

    peerRoom.removeStream(videoStream, peerRoom.getPeers())

    const newSelfStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        deviceId,
      },
    })

    peerRoom.addStream(newSelfStream)
    setVideoStream(newSelfStream)

    shellContext.setSelfVideoStream(newSelfStream)
  }

  const deletePeerVideo = (peerId: string) => {
    const newPeerVideos = { ...shellContext.peerVideoStreams }
    delete newPeerVideos[peerId]
    shellContext.setPeerVideoStreams(newPeerVideos)
  }

  const handleVideoForNewPeer = (peerId: string) => {
    if (videoStream) {
      peerRoom.addStream(videoStream, peerId)
    }

    // TODO: Set up video for peer
  }

  const handleVideoForLeavingPeer = (peerId: string) => {
    if (videoStream) {
      peerRoom.removeStream(videoStream, peerId)
      deletePeerVideo(peerId)
    }
  }

  peerRoom.onPeerJoin(PeerHookType.VIDEO, (peerId: string) => {
    handleVideoForNewPeer(peerId)
  })

  peerRoom.onPeerLeave(PeerHookType.VIDEO, (peerId: string) => {
    handleVideoForLeavingPeer(peerId)
  })

  return {
    videoDevices,
    isSpeakingToRoom,
    setIsSpeakingToRoom,
    handleVideoDeviceSelect,
  }
}
