/* eslint-disable @typescript-eslint/no-unused-vars */
import { useContext, useEffect, useState } from 'react'
import { Metadata } from 'trystero'
import { Torrent } from 'webtorrent'

import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { Peer } from 'models/chat'
import { PeerRoom, PeerHookType } from 'services/PeerRoom'

import { fileTransfer } from 'services/FileTransfer/index'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomFileShareConfig {
  peerRoom: PeerRoom
}

export function useRoomFileShare({ peerRoom }: UseRoomFileShareConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [sharedFile, setSharedFile] = useState<File | null>(null)
  const [selfFileOfferId, setFileOfferId] = useState<string | null>(null)

  const { peerList, setPeerList } = shellContext
  const { peerOfferedFileIds, setPeerOfferedFileIds } = roomContext

  const [sendFileOfferId, receiveFileOfferId] = usePeerRoomAction<
    string | null
  >(peerRoom, PeerActions.FILE_OFFER)

  receiveFileOfferId((torrentMetadata, peerId) => {
    if (torrentMetadata) {
      setPeerOfferedFileIds({ [peerId]: torrentMetadata })
    } else {
      const newPeerTorrents = { ...peerOfferedFileIds }
      delete newPeerTorrents[peerId]

      setPeerOfferedFileIds(newPeerTorrents)
    }

    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.offeredFileId = torrentMetadata
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, (peerId: string) => {
    if (!selfFileOfferId) return

    sendFileOfferId(selfFileOfferId, peerId)
  })

  peerRoom.onPeerLeave(PeerHookType.FILE_SHARE, (peerId: string) => {
    const newPeerTorrents = { ...peerOfferedFileIds }
    delete newPeerTorrents[peerId]

    setPeerOfferedFileIds(newPeerTorrents)
  })

  const handleFileShareStart = async (file: File) => {
    setSharedFile(file)

    const fileOfferId = await fileTransfer.offer(file)
    sendFileOfferId(fileOfferId)
    setFileOfferId(fileOfferId)
  }

  const handleFileShareStop = () => {
    sendFileOfferId(null)
    setFileOfferId(null)
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

  const isSharingFile = Boolean(selfFileOfferId)

  return {
    handleFileShareStart,
    handleFileShareStop,
    isSharingFile,
    sharedFile,
  }
}
