import { useContext, useEffect, useCallback, useState } from 'react'

import { isRecord } from 'lib/type-guards'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import {
  ScreenShareState,
  Peer,
  StreamType,
  AudioChannelName,
  AudioState,
} from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'lib/PeerRoom'

interface UseRoomScreenShareConfig {
  peerRoom: PeerRoom
}

export function useRoomScreenShare({ peerRoom }: UseRoomScreenShareConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [isSharingScreen, setIsSharingScreen] = useState(false)

  const {
    peerList,
    setPeerList,
    setScreenState,
    setAudioChannelState,
    setPeerAudioChannels,
  } = shellContext

  const {
    peerScreenStreams,
    selfScreenStream,
    setPeerScreenStreams,
    setSelfScreenStream,
  } = roomContext

  const [sendScreenShare, receiveScreenShare] =
    peerRoom.makeAction<ScreenShareState>(PeerActions.SCREEN_SHARE)

  receiveScreenShare((screenState, peerId) => {
    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.screenShareState = screenState

        if (screenState === ScreenShareState.NOT_SHARING) {
          deletePeerScreen(peerId)
        }
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  peerRoom.onPeerStream(PeerStreamType.SCREEN, (stream, peerId, metadata) => {
    const isScreenShareStream =
      isRecord(metadata) &&
      'type' in metadata &&
      metadata.type === StreamType.SCREEN_SHARE

    if (!isScreenShareStream) return

    setPeerScreenStreams({
      ...peerScreenStreams,
      [peerId]: stream,
    })

    const [audioStream] = stream.getAudioTracks()

    if (audioStream) {
      setAudioChannelState(prevState => ({
        ...prevState,
        [AudioChannelName.SCREEN_SHARE]: AudioState.PLAYING,
      }))

      const audioTracks = stream.getAudioTracks()

      if (audioTracks.length > 0) {
        const audio = new Audio()
        audio.srcObject = stream
        audio.autoplay = true

        setPeerAudioChannels(peerAudioChannels => {
          return {
            ...peerAudioChannels,
            [peerId]: {
              ...peerAudioChannels[peerId],
              [AudioChannelName.SCREEN_SHARE]: audio,
            },
          }
        })
      }
    }
  })

  const cleanupScreenStream = useCallback(() => {
    if (!selfScreenStream) return

    for (const screenStreamTrack of selfScreenStream.getTracks()) {
      screenStreamTrack.stop()
      selfScreenStream.removeTrack(screenStreamTrack)
    }
  }, [selfScreenStream])

  const handleScreenShareStart = async () => {
    if (selfScreenStream) return

    const displayMedia = await window.navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    })

    peerRoom.addStream(displayMedia, null, {
      type: StreamType.SCREEN_SHARE,
    })

    setSelfScreenStream(displayMedia)
    sendScreenShare(ScreenShareState.SHARING)
    setScreenState(ScreenShareState.SHARING)
    setIsSharingScreen(true)
  }

  const handleScreenShareStop = () => {
    if (!selfScreenStream) return

    cleanupScreenStream()
    peerRoom.removeStream(selfScreenStream, peerRoom.getPeers())
    sendScreenShare(ScreenShareState.NOT_SHARING)
    setScreenState(ScreenShareState.NOT_SHARING)
    setSelfScreenStream(null)
    setIsSharingScreen(false)
  }

  useEffect(() => {
    return () => {
      cleanupScreenStream()
    }
  }, [cleanupScreenStream])

  useEffect(() => {
    return () => {
      if (selfScreenStream) {
        setSelfScreenStream(null)
        setScreenState(ScreenShareState.NOT_SHARING)
      }
    }
  }, [selfScreenStream, setSelfScreenStream, setScreenState])

  useEffect(() => {
    return () => {
      setPeerScreenStreams({})
    }
  }, [setPeerScreenStreams])

  const deletePeerScreen = (peerId: string) => {
    setPeerScreenStreams(({ [peerId]: _, ...newPeerScreens }) => {
      return newPeerScreens
    })

    setPeerAudioChannels(({ ...newPeerAudios }) => {
      if (!newPeerAudios[peerId]) {
        return newPeerAudios
      }

      const screenShareAudio =
        newPeerAudios[peerId][AudioChannelName.SCREEN_SHARE]

      screenShareAudio?.pause()

      const { [AudioChannelName.SCREEN_SHARE]: _, ...newPeerAudioChannels } =
        newPeerAudios[peerId]

      newPeerAudios[peerId] = newPeerAudioChannels

      return newPeerAudios
    })
  }

  const handleScreenForNewPeer = (peerId: string) => {
    if (selfScreenStream) {
      peerRoom.addStream(selfScreenStream, peerId, {
        type: StreamType.SCREEN_SHARE,
      })
    }
  }

  const handleScreenForLeavingPeer = (peerId: string) => {
    if (selfScreenStream) {
      peerRoom.removeStream(selfScreenStream, peerId)
    }

    deletePeerScreen(peerId)
  }

  peerRoom.onPeerJoin(PeerHookType.SCREEN, (peerId: string) => {
    handleScreenForNewPeer(peerId)
  })

  peerRoom.onPeerLeave(PeerHookType.SCREEN, (peerId: string) => {
    handleScreenForLeavingPeer(peerId)
  })

  return {
    handleScreenShareStart,
    handleScreenShareStop,
    isSharingScreen,
    setIsSharingScreen,
  }
}
