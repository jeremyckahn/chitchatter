import { FileOffers } from 'core/chat/fileOffers'
import { createContext, Dispatch, SetStateAction } from 'react'
import { FileTransferService } from 'services/FileTransfer'

export interface RoomContextProps {
  isPrivate: boolean
  isMessageSending: boolean
  isShowingMessages: boolean
  setIsShowingMessages: Dispatch<SetStateAction<boolean>>
  unreadMessages: number
  selfVideoStream: MediaStream | null
  setSelfVideoStream: Dispatch<SetStateAction<MediaStream | null>>
  peerVideoStreams: Record<string, MediaStream>
  setPeerVideoStreams: Dispatch<SetStateAction<Record<string, MediaStream>>>
  selfScreenStream: MediaStream | null
  setSelfScreenStream: Dispatch<SetStateAction<MediaStream | null>>
  peerScreenStreams: Record<string, MediaStream>
  setPeerScreenStreams: Dispatch<SetStateAction<Record<string, MediaStream>>>
  // The core's own snapshot type, carried through unchanged: it is `Readonly`
  // so that a consumer cannot write into the offers the room is still holding.
  peerOfferedFileMetadata: FileOffers
  setPeerOfferedFileMetadata: Dispatch<SetStateAction<FileOffers>>
  fileTransferService: FileTransferService
}

export const RoomContext = createContext<RoomContextProps>({
  isPrivate: false,
  isMessageSending: false,
  isShowingMessages: true,
  setIsShowingMessages: () => {},
  unreadMessages: 0,
  selfVideoStream: null,
  setSelfVideoStream: () => {},
  peerVideoStreams: {},
  setPeerVideoStreams: () => {},
  selfScreenStream: null,
  setSelfScreenStream: () => {},
  peerScreenStreams: {},
  setPeerScreenStreams: () => {},
  peerOfferedFileMetadata: {},
  setPeerOfferedFileMetadata: () => {},
  fileTransferService: new FileTransferService({}),
})
