/* eslint-disable @typescript-eslint/no-unused-vars */
import { useContext, useEffect, useState } from 'react'
import { Metadata } from 'trystero'
import { WebTorrent as WebTorrentType } from 'webtorrent'
import streamSaver from 'streamsaver'

import { isRecord } from 'utils'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions } from 'models/network'
import { FileShareState, Peer, VideoStreamType } from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'services/PeerRoom'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomFileShareConfig {
  peerRoom: PeerRoom
}

type FileMetadata = Pick<File, 'name' | 'size' | 'type'>

// FIXME: Make this configurable
streamSaver.mitm = 'https://jeremyckahn.github.io/StreamSaver.js/mitm.html'

const isFileMetadata = (metadata: Metadata): metadata is FileMetadata => {
  return (
    isRecord(metadata) &&
    'name' in metadata &&
    typeof metadata.name === 'string' &&
    'size' in metadata &&
    typeof metadata.size === 'number' &&
    'type' in metadata &&
    typeof metadata.type === 'string'
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

  const [webTorrentClient] = useState(
    () => new (WebTorrent as unknown as WebTorrentType)()
  )

  const [sendMagnetURI, receiveMagnetURI] = usePeerRoomAction<string>(
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

  receiveMagnetURI((magnet, _peerId) => {
    const fileStream = streamSaver.createWriteStream('saved-file')
    const writer = fileStream.getWriter()

    webTorrentClient.add(magnet, torrent => {
      for (const file of torrent.files) {
        file
          .createReadStream()
          .on('data', data => {
            writer.write(data)
          })
          .on('end', () => {
            writer.close()
          })
      }
    })
  })

  const handleFileShareStart = async (file: File) => {
    setIsSharingFile(true)
    setSharedFile(file)
    sendFileShareState(FileShareState.SHARING)

    // FIXME: Don't automatically send to peers. Wait for them to request it.
    const { name, size, type }: FileMetadata = file
    const arrayBuffer = await file.arrayBuffer()

    webTorrentClient.seed(file, torrent => {
      sendMagnetURI(torrent.magnetURI)
    })
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
