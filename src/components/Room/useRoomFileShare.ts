import { useContext, useEffect, useState } from 'react'

import { sleep } from 'utils'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { Peer } from 'models/chat'
import { PeerRoom, PeerHookType } from 'services/PeerRoom'

import { fileTransfer } from 'services/FileTransfer/index'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomFileShareConfig {
  onInlineMediaUpload: (files: File[]) => void
  peerRoom: PeerRoom
}

const isInlineMediaFile = (file: File) => {
  return ['image', 'audio', 'video'].includes(file.type.split('/')[0])
}

export function useRoomFileShare({
  onInlineMediaUpload,
  peerRoom,
}: UseRoomFileShareConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [sharedFiles, setSharedFiles] = useState<FileList | null>(null)
  const [selfFileOfferId, setFileOfferId] = useState<string | null>(null)
  const [isFileShareButtonEnabled, setIsFileShareButtonEnabled] = useState(true)

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

      if (fileOfferId && fileTransfer.isOffering(fileOfferId)) {
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

    // This sleep is needed to prevent this peer from not appearing on other
    // peers' peer lists. This is because Trystero's interaction between
    // onPeerJoin and its actions is not totally compatible with React's
    // lifecycle hooks. In this case, the reference to peerList in
    // receiveFileOfferId is out of date and prevents this peer from ever being
    // added to the receiver's peer list. Deferring the sendFileOfferId call to
    // the next tick serves as a workaround.
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

  const handleFileShareStart = async (files: FileList) => {
    const inlineMediaFiles = [...files].filter(isInlineMediaFile)

    setSharedFiles(files)
    setIsFileShareButtonEnabled(false)

    const fileOfferId = await fileTransfer.offer(files)

    if (inlineMediaFiles.length > 0) {
      onInlineMediaUpload(inlineMediaFiles)
    }

    sendFileOfferId(fileOfferId)
    setFileOfferId(fileOfferId)

    setIsFileShareButtonEnabled(true)
  }

  const handleFileShareStop = () => {
    sendFileOfferId(null)
    setFileOfferId(null)

    if (
      selfFileOfferId &&
      fileTransfer.isOffering(selfFileOfferId) &&
      sharedFiles &&
      ![...sharedFiles].every(isInlineMediaFile)
    ) {
      fileTransfer.rescind(selfFileOfferId)
    }
  }

  useEffect(() => {
    return () => {
      fileTransfer.rescindAll()
      sendFileOfferId(null)
    }
  }, [sendFileOfferId])

  const isSharingFile = Boolean(selfFileOfferId)

  return {
    handleFileShareStart,
    handleFileShareStop,
    isFileShareButtonEnabled,
    isSharingFile,
    sharedFiles,
  }
}
