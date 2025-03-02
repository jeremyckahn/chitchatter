import { useContext, useEffect, useState } from 'react'

import { sleep } from 'lib/sleep'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerAction } from 'models/network'
import { FileOfferMetadata, Peer } from 'models/chat'
import { PeerRoom, PeerHookType, ActionNamespace } from 'lib/PeerRoom'
import { fileTransfer } from 'lib/FileTransfer'
import { usePeerAction } from 'hooks/usePeerAction'

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
  const [selfFileOfferMagnetUri, setFileOfferMagnetUri] = useState<
    string | null
  >(null)
  const [isFileSharingEnabled, setIsFileSharingEnabled] = useState(true)

  const { peerList, setPeerList, showAlert } = shellContext
  const { peerOfferedFileMetadata, setPeerOfferedFileMetadata } = roomContext

  const [sendFileOfferMetadata] = usePeerAction<FileOfferMetadata | null>({
    namespace: ActionNamespace.GROUP,
    peerAction: PeerAction.FILE_OFFER,
    peerRoom,
    onReceive: (fileOfferMetadata, peerId) => {
      if (fileOfferMetadata) {
        setPeerOfferedFileMetadata({ [peerId]: fileOfferMetadata })
      }
      // NOTE: Sometimes the peerOfferedFileMetadata reference is stale, so
      // this branch only uses it if it has a reference to the target peer's
      // metadata.
      else if (peerOfferedFileMetadata?.[peerId]) {
        const fileOfferMetadata = peerOfferedFileMetadata[peerId]
        const { magnetURI, isAllInlineMedia } = fileOfferMetadata

        if (
          fileOfferMetadata &&
          fileTransfer.isOffering(magnetURI) &&
          !isAllInlineMedia
        ) {
          fileTransfer.rescind(magnetURI)
        }

        const newFileOfferMetadata = { ...peerOfferedFileMetadata }
        delete newFileOfferMetadata[peerId]

        setPeerOfferedFileMetadata(newFileOfferMetadata)
      }

      const newPeerList = peerList.map(peer => {
        const newPeer: Peer = { ...peer }

        if (peer.peerId === peerId) {
          newPeer.offeredFileId = fileOfferMetadata?.magnetURI ?? null
        }

        return newPeer
      })

      setPeerList(newPeerList)
    },
  })

  const isEveryFileInlineMedia = (files: FileList | null) =>
    Boolean(files && [...files].every(isInlineMediaFile))

  peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, async (peerId: string) => {
    if (!selfFileOfferMagnetUri) return

    // This sleep is needed to prevent this peer from not appearing on other
    // peers' peer lists. This is because Trystero's interaction between
    // onPeerJoin and its actions is not totally compatible with React's
    // lifecycle hooks. In this case, the reference to peerList in
    // receiveFileOfferMetadata is out of date and prevents this peer from ever
    // being added to the receiver's peer list. Deferring the
    // sendFileOfferMetadata call to the next tick serves as a workaround.
    await sleep(1)

    sendFileOfferMetadata(
      {
        magnetURI: selfFileOfferMagnetUri,
        isAllInlineMedia: isEveryFileInlineMedia(sharedFiles),
      },
      peerId
    )
  })

  peerRoom.onPeerLeave(PeerHookType.FILE_SHARE, (peerId: string) => {
    const fileOfferMetadata = peerOfferedFileMetadata[peerId]

    if (!fileOfferMetadata) return

    const { magnetURI, isAllInlineMedia } = fileOfferMetadata

    if (fileTransfer.isOffering(magnetURI) && !isAllInlineMedia) {
      fileTransfer.rescind(magnetURI)
    }

    const newPeerFileOfferMetadata = { ...peerOfferedFileMetadata }
    delete newPeerFileOfferMetadata[peerId]
    setPeerOfferedFileMetadata(newPeerFileOfferMetadata)
  })

  const handleFileShareStart = async (files: FileList) => {
    const inlineMediaFiles = [...files].filter(isInlineMediaFile)

    setSharedFiles(files)
    setIsFileSharingEnabled(false)

    if (!shellContext.roomId) {
      throw new Error('shellContext.roomId is not a non-empty string')
    }

    const alertText =
      files.length > 1
        ? 'Encrypting a copy of the files...'
        : 'Encrypting a copy of the file...'
    showAlert(alertText, { severity: 'info' })

    const magnetURI = await fileTransfer.offer(files, shellContext.roomId)

    showAlert('Encryption complete', { severity: 'success' })

    if (inlineMediaFiles.length > 0) {
      onInlineMediaUpload(inlineMediaFiles)
    }

    sendFileOfferMetadata({
      magnetURI,
      isAllInlineMedia: isEveryFileInlineMedia(files),
    })

    setFileOfferMagnetUri(magnetURI)
    setIsFileSharingEnabled(true)
  }

  const handleFileShareStop = () => {
    sendFileOfferMetadata(null)
    setFileOfferMagnetUri(null)

    if (
      selfFileOfferMagnetUri &&
      fileTransfer.isOffering(selfFileOfferMagnetUri) &&
      !isEveryFileInlineMedia(sharedFiles)
    ) {
      fileTransfer.rescind(selfFileOfferMagnetUri)
    }
  }

  useEffect(() => {
    return () => {
      fileTransfer.rescindAll()
      sendFileOfferMetadata(null)
    }
  }, [sendFileOfferMetadata])

  const isSharingFile = Boolean(selfFileOfferMagnetUri)

  return {
    handleFileShareStart,
    handleFileShareStop,
    isFileSharingEnabled,
    isSharingFile,
    sharedFiles,
  }
}
