/* eslint-disable @typescript-eslint/no-unused-vars */
import { useContext, useEffect, useState } from 'react'
import { Metadata } from 'trystero'
import { Torrent, WebTorrent as WebTorrentType } from 'webtorrent'

import { isRecord } from 'utils'
import { RoomContext } from 'contexts/RoomContext'
import { ShellContext } from 'contexts/ShellContext'
import { PeerActions, TorrentMetadata } from 'models/network'
import { Peer } from 'models/chat'
import { PeerRoom, PeerHookType, PeerStreamType } from 'services/PeerRoom'

// @ts-ignore
import WebTorrent from 'webtorrent/webtorrent.min.js'

import { usePeerRoomAction } from './usePeerRoomAction'

interface UseRoomFileShareConfig {
  peerRoom: PeerRoom
}

export function useRoomFileShare({ peerRoom }: UseRoomFileShareConfig) {
  const shellContext = useContext(ShellContext)
  const roomContext = useContext(RoomContext)
  const [sharedFile, setSharedFile] = useState<File | null>(null)
  const [selfTorrent, setSelfTorrent] = useState<Torrent | null>(null)

  const { peerList, setPeerList } = shellContext
  const { peerTorrents, setPeerTorrents } = roomContext

  const [webTorrentClient] = useState(
    () => new (WebTorrent as unknown as WebTorrentType)()
  )

  const [sendTorrentMetadata, receiveTorrentMetadata] =
    usePeerRoomAction<TorrentMetadata | null>(peerRoom, PeerActions.FILE_SHARE)

  receiveTorrentMetadata((torrentMetadata, peerId) => {
    if (torrentMetadata) {
      setPeerTorrents({ [peerId]: torrentMetadata })
    } else {
      const newPeerTorrents = { ...peerTorrents }
      delete newPeerTorrents[peerId]

      setPeerTorrents(newPeerTorrents)
    }

    const newPeerList = peerList.map(peer => {
      const newPeer: Peer = { ...peer }

      if (peer.peerId === peerId) {
        newPeer.torrentMetadata = torrentMetadata
      }

      return newPeer
    })

    setPeerList(newPeerList)
  })

  peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, (peerId: string) => {
    if (!selfTorrent) return

    const { magnetURI } = selfTorrent
    sendTorrentMetadata({ magnetURI }, peerId)
  })

  peerRoom.onPeerLeave(PeerHookType.FILE_SHARE, (peerId: string) => {
    const newPeerTorrents = { ...peerTorrents }
    delete newPeerTorrents[peerId]

    setPeerTorrents(newPeerTorrents)
  })

  const handleFileShareStart = async (file: File) => {
    setSharedFile(file)

    webTorrentClient.seed(file, torrent => {
      const { magnetURI } = torrent
      sendTorrentMetadata({ magnetURI })
      setSelfTorrent(torrent)
    })
  }

  const handleFileShareStop = () => {
    sendTorrentMetadata(null)
    setSelfTorrent(null)
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

  const isSharingFile = Boolean(selfTorrent)

  return {
    handleFileShareStart,
    handleFileShareStop,
    isSharingFile,
    sharedFile,
  }
}
