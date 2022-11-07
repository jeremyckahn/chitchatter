import { createContext, Dispatch, SetStateAction } from 'react'

interface RoomContextProps {
  selfVideoStream: MediaStream | null
  setSelfVideoStream: Dispatch<SetStateAction<MediaStream | null>>
  peerVideoStreams: Record<string, MediaStream>
  setPeerVideoStreams: Dispatch<SetStateAction<Record<string, MediaStream>>>
}

export const RoomContext = createContext<RoomContextProps>({
  selfVideoStream: null,
  setSelfVideoStream: () => {},
  peerVideoStreams: {},
  setPeerVideoStreams: () => {},
})
