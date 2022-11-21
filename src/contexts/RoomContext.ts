import { createContext, Dispatch, SetStateAction } from 'react'

import { TorrentMetadata } from 'models/network'

interface RoomContextProps {
  selfVideoStream: MediaStream | null
  setSelfVideoStream: Dispatch<SetStateAction<MediaStream | null>>
  peerVideoStreams: Record<string, MediaStream>
  setPeerVideoStreams: Dispatch<SetStateAction<Record<string, MediaStream>>>
  selfScreenStream: MediaStream | null
  setSelfScreenStream: Dispatch<SetStateAction<MediaStream | null>>
  peerScreenStreams: Record<string, MediaStream>
  setPeerScreenStreams: Dispatch<SetStateAction<Record<string, MediaStream>>>
  peerTorrents: Record<string, TorrentMetadata>
  setPeerTorrents: Dispatch<SetStateAction<Record<string, TorrentMetadata>>>
}

export const RoomContext = createContext<RoomContextProps>({
  selfVideoStream: null,
  setSelfVideoStream: () => {},
  peerVideoStreams: {},
  setPeerVideoStreams: () => {},
  selfScreenStream: null,
  setSelfScreenStream: () => {},
  peerScreenStreams: {},
  setPeerScreenStreams: () => {},
  peerTorrents: {},
  setPeerTorrents: () => {},
})
