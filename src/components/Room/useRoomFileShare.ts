import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sleep } from 'lib/sleep'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerAction } from 'models/network'
import { FileOfferMetadata, Peer } from 'models/chat'
import { PeerRoom, PeerHookType, ActionNamespace } from 'lib/PeerRoom'
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
  const { t } = useTranslation()
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [sharedFiles, setSharedFiles] = useState<FileList | null>(null)
  const [selfFileOfferMagnetUri, setFileOfferMagnetUri] = useState<
    string | null
  >(null)
  const [isFileSharingEnabled, setIsFileSharingEnabled] = useState(true)

  const { setPeerList, showAlert } = shellContext
  const {
    peerOfferedFileMetadata,
    setPeerOfferedFileMetadata,
    fileTransferService,
  } = roomContext

  const [sendFileOfferMetadata] = usePeerAction<FileOfferMetadata | null>({
    namespace: ActionNamespace.GROUP,
    peerAction: PeerAction.FILE_OFFER,
    peerRoom,
    onReceive: (fileOfferMetadata, peerId) => {
      if (fileOfferMetadata) {
        setPeerOfferedFileMetadata({ [peerId]: fileOfferMetadata })
      } else {
        fileOfferMetadata = peerOfferedFileMetadata[peerId]
        const { magnetURI, isAllInlineMedia } = fileOfferMetadata || {}

        if (
          fileOfferMetadata &&
          magnetURI &&
          fileTransferService.isOffering(magnetURI) &&
          !isAllInlineMedia
        ) {
          fileTransferService.rescind(magnetURI)
        }

        const newFileOfferMetadata = { ...peerOfferedFileMetadata }
        delete newFileOfferMetadata[peerId]

        setPeerOfferedFileMetadata(newFileOfferMetadata)
      }

      setPeerList(prev => {
        const newPeerList = prev.map(peer => {
          const newPeer: Peer = { ...peer }

          if (peer.peerId === peerId) {
            newPeer.offeredFileId = fileOfferMetadata?.magnetURI ?? null
          }

          return newPeer
        })

        return newPeerList
      })
    },
  })

  const isEveryFileInlineMedia = (files: FileList | null) =>
    Boolean(files && [...files].every(isInlineMediaFile))

  peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, async (peerId: string) => {
    if (!selfFileOfferMagnetUri) return

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

    if (fileTransferService.isOffering(magnetURI) && !isAllInlineMedia) {
      fileTransferService.rescind(magnetURI)
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

    showAlert(
      files.length > 1
        ? t('fileShare.encryptingFiles')
        : t('fileShare.encryptingFile'),
      { severity: 'info' }
    )

    const magnetURI = await fileTransferService.offer(
      files,
      shellContext.roomId
    )

    showAlert(t('fileShare.encryptionComplete'), { severity: 'success' })

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
      fileTransferService.isOffering(selfFileOfferMagnetUri) &&
      !isEveryFileInlineMedia(sharedFiles)
    ) {
      fileTransferService.rescind(selfFileOfferMagnetUri)
    }
  }

  useEffect(() => {
    return () => {
      fileTransferService.rescindAll()
    }
  }, [fileTransferService])

  const isSharingFile = Boolean(selfFileOfferMagnetUri)

  return {
    handleFileShareStart,
    handleFileShareStop,
    isFileSharingEnabled,
    isSharingFile,
    sharedFiles,
  }
}
