import { useContext, useEffect, useCallback, useState } from 'react'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { VideoState, Peer, VideoStreamType } from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'services/PeerRoom'

import { isRecord } from 'utils'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomVideoConfig {
  peerRoom: PeerRoom
}

export function useRoomVideo({ peerRoom }: UseRoomVideoConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [isCameraEnabled, setIsCameraEnabled] = useState(false)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<
    string | null
  >(null)

  const { peerList, setPeerList, setVideoState } = shellContext

  const {
    peerVideoStreams,
    selfVideoStream,
    setPeerVideoStreams,
    setSelfVideoStream,
  } = roomContext

  useEffect(() => {
    ;(async () => {
      if (!selfVideoStream) return

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

      if (newVideoDevices.length > 0 && !selfVideoStream) {
        const [firstVideoDevice] = newVideoDevices
        const newSelfStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId: firstVideoDevice.deviceId,
          },
        })

        peerRoom.addStream(newSelfStream, null, {
          type: VideoStreamType.WEBCAM,
        })
        setSelfVideoStream(newSelfStream)

        setSelfVideoStream(newSelfStream)
      }
    })()
  }, [peerRoom, selfVideoStream, setSelfVideoStream])

  const [sendVideoChange, receiveVideoChange] = usePeerRoomAction<VideoState>(
    peerRoom,
    PeerActions.VIDEO_CHANGE
  )

  receiveVideoChange((videoState, peerId) => {
    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.videoState = videoState

        if (videoState === VideoState.STOPPED) {
          deletePeerVideo(peerId)
        }
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  peerRoom.onPeerStream(PeerStreamType.VIDEO, (stream, peerId, metadata) => {
    const isWebcamStream =
      isRecord(metadata) &&
      'type' in metadata &&
      metadata.type === VideoStreamType.WEBCAM

    if (!isWebcamStream) return

    setPeerVideoStreams({
      ...peerVideoStreams,
      [peerId]: stream,
    })
  })

  const cleanupVideo = useCallback(() => {
    if (!selfVideoStream) return

    for (const videoTrack of selfVideoStream.getTracks()) {
      videoTrack.stop()
      selfVideoStream.removeTrack(videoTrack)
    }
  }, [selfVideoStream])

  useEffect(() => {
    ;(async () => {
      if (isCameraEnabled) {
        if (!selfVideoStream) {
          const newSelfStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: selectedVideoDeviceId
              ? { deviceId: selectedVideoDeviceId }
              : true,
          })

          peerRoom.addStream(newSelfStream, null, {
            type: VideoStreamType.WEBCAM,
          })
          sendVideoChange(VideoState.PLAYING)
          setVideoState(VideoState.PLAYING)
          setSelfVideoStream(newSelfStream)
        }
      } else {
        if (selfVideoStream) {
          cleanupVideo()

          peerRoom.removeStream(selfVideoStream, peerRoom.getPeers())
          sendVideoChange(VideoState.STOPPED)
          setVideoState(VideoState.STOPPED)
          setSelfVideoStream(null)
          setSelfVideoStream(null)
        }
      }
    })()
  }, [
    isCameraEnabled,
    peerRoom,
    selfVideoStream,
    selectedVideoDeviceId,
    sendVideoChange,
    cleanupVideo,
    setSelfVideoStream,
    setVideoState,
  ])

  useEffect(() => {
    return () => {
      cleanupVideo()
    }
  }, [cleanupVideo])

  useEffect(() => {
    return () => {
      if (selfVideoStream) {
        setSelfVideoStream(null)
        setVideoState(VideoState.STOPPED)
      }
    }
  }, [selfVideoStream, setSelfVideoStream, setVideoState])

  useEffect(() => {
    return () => {
      setPeerVideoStreams({})
    }
  }, [setPeerVideoStreams])

  const handleVideoDeviceSelect = async (videoDevice: MediaDeviceInfo) => {
    const { deviceId } = videoDevice
    setSelectedVideoDeviceId(deviceId)

    if (!selfVideoStream) return

    for (const videoTrack of selfVideoStream.getTracks()) {
      videoTrack.stop()
      selfVideoStream.removeTrack(videoTrack)
    }

    peerRoom.removeStream(selfVideoStream, peerRoom.getPeers())

    const newSelfStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        deviceId,
      },
    })

    peerRoom.addStream(newSelfStream, null, { type: VideoStreamType.WEBCAM })
    setSelfVideoStream(newSelfStream)
  }

  const deletePeerVideo = (peerId: string) => {
    const newPeerVideos = { ...peerVideoStreams }
    delete newPeerVideos[peerId]
    setPeerVideoStreams(newPeerVideos)
  }

  const handleVideoForNewPeer = (peerId: string) => {
    if (selfVideoStream) {
      peerRoom.addStream(selfVideoStream, peerId, {
        type: VideoStreamType.WEBCAM,
      })
    }
  }

  const handleVideoForLeavingPeer = (peerId: string) => {
    if (selfVideoStream) {
      peerRoom.removeStream(selfVideoStream, peerId)
    }

    deletePeerVideo(peerId)
  }

  peerRoom.onPeerJoin(PeerHookType.VIDEO, (peerId: string) => {
    handleVideoForNewPeer(peerId)
  })

  peerRoom.onPeerLeave(PeerHookType.VIDEO, (peerId: string) => {
    handleVideoForLeavingPeer(peerId)
  })

  return {
    videoDevices,
    isCameraEnabled,
    setIsCameraEnabled,
    handleVideoDeviceSelect,
  }
}
