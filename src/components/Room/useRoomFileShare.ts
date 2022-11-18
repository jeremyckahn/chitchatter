/* eslint-disable @typescript-eslint/no-unused-vars */
import { useContext, useEffect, useState } from 'react'

import { isRecord } from 'utils'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { FileShareState, Peer, VideoStreamType } from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'services/PeerRoom'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomFileShareConfig {
  peerRoom: PeerRoom
}

export function useRoomFileShare({ peerRoom }: UseRoomFileShareConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [isSharingFile, setIsSharingFile] = useState(false)

  const { peerList, setPeerList } = shellContext

  const [sendFileShare, receiveFileShare] = usePeerRoomAction<FileShareState>(
    peerRoom,
    PeerActions.FILE_SHARE
  )

  receiveFileShare((fileShareState, peerId) => {
    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.fileShareState = fileShareState

        if (fileShareState === FileShareState.NOT_SHARING) {
          stopPeerFileShare(peerId)
        }
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  const handleFileShareStart = async () => {
    setIsSharingFile(true)
    // TODO
  }

  const handleFileShareStop = () => {
    setIsSharingFile(false)
    // TODO
  }

  // TODO: Clean up on unmount
  // useEffect(() => {
  // return () => {
  // cleanupFileShare()
  // }
  // }, [cleanupFileShare])

  const stopPeerFileShare = (peerId: string) => {
    // TODO
  }

  const handleFileShareForNewPeer = (peerId: string) => {
    // TODO
  }

  const handleFileShareForLeavingPeer = (peerId: string) => {
    // TODO
  }

  return {
    handleFileShareStart,
    handleFileShareStop,
    isSharingFile,
    setIsSharingFile,
  }
}
