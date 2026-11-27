import { createContext, Dispatch, SetStateAction } from 'react'

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
})
