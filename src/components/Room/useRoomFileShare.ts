/* eslint-disable @typescript-eslint/no-unused-vars */
import { useContext, useEffect, useState } from 'react'
import { Metadata } from 'trystero'

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

type FileMetadata = Pick<File, 'name' | 'size'>

const isFileMetadata = (metadata: Metadata): metadata is FileMetadata => {
  return (
    isRecord(metadata) &&
    'name' in metadata &&
    typeof metadata.name === 'string' &&
    'size' in metadata &&
    typeof metadata.size === 'number'
  )
}

export function useRoomFileShare({ peerRoom }: UseRoomFileShareConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [isSharingFile, setIsSharingFile] = useState(false)
  const [sharedFile, setSharedFile] = useState<File | null>(null)

  const { peerList, setPeerList } = shellContext

  const [sendFileShareState, receiveFileShareState] =
    usePeerRoomAction<FileShareState>(peerRoom, PeerActions.FILE_SHARE_STATE)

  const [sendFileShare, receiveFileShare] = usePeerRoomAction<File>(
    peerRoom,
    PeerActions.FILE_SHARE
  )

  receiveFileShareState((fileShareState, peerId) => {
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

  receiveFileShare((file, peerId, metadata) => {
    if (!isFileMetadata(metadata)) {
      console.error('Received invalid file data')
      return
    }

    console.log('received file from peer', { file, peerId, metadata })
  })

  const handleFileShareStart = async (file: File) => {
    setIsSharingFile(true)
    setSharedFile(file)
    sendFileShareState(FileShareState.SHARING)

    // FIXME: Don't automatically send to peers. Wait for them to request it.
    const { name, size }: FileMetadata = file
    sendFileShare(file, null, { name, size })
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
    sharedFile,
  }
}
