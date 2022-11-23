/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useContext, useEffect, useState } from 'react'

import { sleep } from 'utils'
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
  const [sharedFiles, setSharedFiles] = useState<FileList | null>(null)
  const [selfFileOfferId, setFileOfferId] = useState<string | null>(null)

  const { peerList, setPeerList } = shellContext
  const { peerOfferedFileIds, setPeerOfferedFileIds } = roomContext

  const [sendFileOfferId, receiveFileOfferId] = usePeerRoomAction<
    string | null
  >(peerRoom, PeerActions.FILE_OFFER)

  receiveFileOfferId((fileOfferId, peerId) => {
    if (fileOfferId) {
      setPeerOfferedFileIds({ [peerId]: fileOfferId })
    } else {
      const fileOfferId = peerOfferedFileIds[peerId]

      if (fileOfferId) {
        fileTransfer.rescind(fileOfferId)
      }

      const newFileOfferIds = { ...peerOfferedFileIds }
      delete newFileOfferIds[peerId]

      setPeerOfferedFileIds(newFileOfferIds)
    }

    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.offeredFileId = fileOfferId
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, async (peerId: string) => {
    if (!selfFileOfferId) return

    await sleep(1)
    sendFileOfferId(selfFileOfferId, peerId)
  })

  peerRoom.onPeerLeave(PeerHookType.FILE_SHARE, (peerId: string) => {
    const fileOfferId = peerOfferedFileIds[peerId]

    if (!fileOfferId) return

    if (fileTransfer.isOffering(fileOfferId)) {
      fileTransfer.rescind(fileOfferId)
    }

    const newPeerFileOfferIds = { ...peerOfferedFileIds }
    delete newPeerFileOfferIds[peerId]
    setPeerOfferedFileIds(newPeerFileOfferIds)
  })

  const cleanupFileShare = useCallback(() => {
    if (selfFileOfferId) {
      fileTransfer.rescind(selfFileOfferId)
    }
  }, [selfFileOfferId])

  const handleFileShareStart = async (files: FileList) => {
    setSharedFiles(files)

    const fileOfferId = await fileTransfer.offer(files)
    sendFileOfferId(fileOfferId)
    setFileOfferId(fileOfferId)
  }

  const handleFileShareStop = () => {
    sendFileOfferId(null)
    setFileOfferId(null)
    cleanupFileShare()
  }

  const isSharingFile = Boolean(selfFileOfferId)

  // TODO: Test that this works
  useEffect(() => {
    return () => {
      cleanupFileShare()
    }
  }, [cleanupFileShare])

  return {
    handleFileShareStart,
    handleFileShareStop,
    isSharingFile,
    sharedFiles,
  }
}
