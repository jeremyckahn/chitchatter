import { useContext, useEffect, useState } from 'react'

import { ChatRoom } from 'core/chat/ChatRoom'
import { getInlineMediaFiles } from 'core/chat/fileOffers'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import {
  useChatRoomFileOffers,
  useChatRoomSelfFileOffer,
} from 'hooks/useChatRoomState'

/**
 * The part of a room these controls use. Narrower than `ChatRoom` on purpose,
 * so that a test can stand in a stub the compiler checks against the real
 * members rather than asserting a partial object into the whole class.
 */
export type FileShareChatRoom = Pick<
  ChatRoom,
  | 'getFileOffers'
  | 'getSelfFileOfferMagnetUri'
  | 'offerFiles'
  | 'on'
  | 'rescindFileOffer'
>

interface UseRoomFileShareConfig {
  onInlineMediaUpload: (files: File[]) => void
  chatRoom: FileShareChatRoom
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
  const [sharedFiles, setSharedFiles] = useState<File[] | null>(null)
  const [isFileSharingEnabled, setIsFileSharingEnabled] = useState(true)

  const peerOfferedFileMetadata = useChatRoomFileOffers(chatRoom)

  // Read from the room rather than tracked here. The room is what decides
  // whether an offer exists — it refuses one outright after `leave()`, and
  // clears its own before a rescind can fail — so a second copy of the answer
  // could only ever disagree with it and leave the control stuck.
  const selfFileOfferMagnetUri = useChatRoomSelfFileOffer(chatRoom)
  const isSharingFile = Boolean(selfFileOfferMagnetUri)

  useEffect(() => {
    setPeerOfferedFileMetadata(peerOfferedFileMetadata)
  }, [peerOfferedFileMetadata, setPeerOfferedFileMetadata])

  const handleFileShareStart = async (files: FileList) => {
    const fileArray = [...files]
    const inlineMediaFiles = getInlineMediaFiles(fileArray)

    // State holds the copy, not the live `FileList`: the input empties that
    // list in place when it is reset after selection, and the stop-sharing
    // label still needs the file's name.
    setSharedFiles(fileArray)
    setIsFileSharingEnabled(false)

    showAlert(
      files.length > 1
        ? 'Encrypting a copy of the files...'
        : 'Encrypting a copy of the file...',
      { severity: 'info' }
    )

    try {
      // A room that has already been left resolves without offering anything,
      // so the magnet URI is what distinguishes a real share from a refused
      // one. Reporting success for the latter would put a "stop sharing"
      // control on screen with nothing behind it to stop.
      const magnetURI = await chatRoom.offerFiles(fileArray)

      if (!magnetURI) {
        showAlert('The file could not be shared', { severity: 'error' })

        return
      }

      showAlert('Encryption complete', { severity: 'success' })

      if (inlineMediaFiles.length > 0) {
        onInlineMediaUpload(inlineMediaFiles)
      }
    } catch (_error) {
      showAlert('The file could not be shared', { severity: 'error' })
    } finally {
      setIsFileSharingEnabled(true)
    }
  }

  /**
   * Nothing to await and nothing to undo: the room clears its own offer before
   * anything that can fail, reports a failed announcement on its error event
   * rather than throwing, and `isSharingFile` above reads the result back from
   * it.
   */
  const handleFileShareStop = () => {
    void chatRoom.rescindFileOffer()
  }

  return {
    handleFileShareStart,
    handleFileShareStop,
    isFileSharingEnabled,
    isSharingFile,
    sharedFiles,
  }
}
