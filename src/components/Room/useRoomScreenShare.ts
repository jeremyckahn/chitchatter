import { useContext, useEffect, useCallback, useState } from 'react'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { ScreenShareState, Peer } from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'services/PeerRoom'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomScreenShareConfig {
  peerRoom: PeerRoom
}

export function useRoomScreenShare({ peerRoom }: UseRoomScreenShareConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [isSharingScreen, setIsSharingScreen] = useState(false)

  const { peerList, setPeerList, setScreenState } = shellContext

  const {
    peerScreenStreams,
    selfScreenStream,
    setPeerScreenStreams,
    setSelfScreenStream,
  } = roomContext

  const [sendScreenShare, receiveScreenShare] =
    usePeerRoomAction<ScreenShareState>(peerRoom, PeerActions.SCREEN_SHARE)

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

  peerRoom.onPeerStream(PeerStreamType.SCREEN, (stream, peerId) => {
    const screenTracks = stream.getVideoTracks()

    if (screenTracks.length === 0) return

    setPeerScreenStreams({
      ...peerScreenStreams,
      [peerId]: stream,
    })
  })

  const cleanupScreen = useCallback(() => {
    if (!selfScreenStream) return

    for (const screenTrack of selfScreenStream.getTracks()) {
      screenTrack.stop()
      selfScreenStream.removeTrack(screenTrack)
    }
  }, [selfScreenStream])

  const handleScreenShareStart = async () => {
    if (selfScreenStream) return

    const displayMedia = await window.navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    })

    peerRoom.addStream(displayMedia)
    setSelfScreenStream(displayMedia)
    sendScreenShare(ScreenShareState.SHARING)
    setScreenState(ScreenShareState.SHARING)
    setIsSharingScreen(true)
  }

  const handleScreenShareStop = () => {
    if (!selfScreenStream) return

    cleanupScreen()
    peerRoom.removeStream(selfScreenStream, peerRoom.getPeers())
    sendScreenShare(ScreenShareState.NOT_SHARING)
    setScreenState(ScreenShareState.NOT_SHARING)
    setSelfScreenStream(null)
    setIsSharingScreen(false)
  }

  useEffect(() => {
    return () => {
      cleanupScreen()
    }
  }, [cleanupScreen])

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
    const newPeerScreens = { ...peerScreenStreams }
    delete newPeerScreens[peerId]
    setPeerScreenStreams(newPeerScreens)
  }

  const handleScreenForNewPeer = (peerId: string) => {
    if (selfScreenStream) {
      peerRoom.addStream(selfScreenStream, peerId)
    }
  }

  const handleScreenForLeavingPeer = (peerId: string) => {
    if (selfScreenStream) {
      peerRoom.removeStream(selfScreenStream, peerId)
      deletePeerScreen(peerId)
    }
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
