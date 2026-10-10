import { useContext, useEffect, useState } from 'react'

import { ChatRoom } from 'core/chat/ChatRoom'
import {
  getInlineMediaFiles,
  isEveryFileInlineMedia,
} from 'core/chat/fileOffers'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { useChatRoomFileOffers } from 'hooks/useChatRoomState'

interface UseRoomFileShareConfig {
  onInlineMediaUpload: (files: File[]) => void
  chatRoom: ChatRoom
}

/**
 * The file-sharing controls' view of the room.
 *
 * The offer/rescind state machine, inline-media classification and peer
 * bookkeeping all live in the core now; what is left here is the local file
 * selection and the progress alerts, both of which are presentation.
 */
export const useRoomFileShare = ({
  onInlineMediaUpload,
  chatRoom,
}: UseRoomFileShareConfig) => {
  const { showAlert } = useContext(ShellContext)
  const { setPeerOfferedFileMetadata } = useContext(RoomContext)
  const [sharedFiles, setSharedFiles] = useState<FileList | null>(null)
  const [isFileSharingEnabled, setIsFileSharingEnabled] = useState(true)
  const [isSharingFile, setIsSharingFile] = useState(false)

  const peerOfferedFileMetadata = useChatRoomFileOffers(chatRoom)

  useEffect(() => {
    setPeerOfferedFileMetadata(peerOfferedFileMetadata)
  }, [peerOfferedFileMetadata, setPeerOfferedFileMetadata])

  const handleFileShareStart = async (files: FileList) => {
    const fileArray = [...files]
    const inlineMediaFiles = getInlineMediaFiles(fileArray) as File[]

    setSharedFiles(files)
    setIsFileSharingEnabled(false)

    showAlert(
      files.length > 1
        ? 'Encrypting a copy of the files...'
        : 'Encrypting a copy of the file...',
      { severity: 'info' }
    )

    try {
      await chatRoom.offerFiles(fileArray)

      showAlert('Encryption complete', { severity: 'success' })

      if (inlineMediaFiles.length > 0) {
        onInlineMediaUpload(inlineMediaFiles)
      }

      setIsSharingFile(true)
    } catch (_error) {
      showAlert('The file could not be shared', { severity: 'error' })
    } finally {
      setIsFileSharingEnabled(true)
    }
  }

  const handleFileShareStop = async () => {
    await chatRoom.rescindFileOffer()
    setIsSharingFile(false)
  }

  return {
    handleFileShareStart,
    handleFileShareStop,
    isFileSharingEnabled,
    isSharingFile,
    sharedFiles,
    isEveryFileInlineMedia: isEveryFileInlineMedia([...(sharedFiles ?? [])]),
  }
}
