import { createContext, Dispatch, SetStateAction } from 'react'

import { AlertOptions } from 'models/shell'
import { AudioState, ScreenShareState, VideoState, Peer } from 'models/chat'

interface ShellContextProps {
  numberOfPeers: number
  tabHasFocus: boolean
  setDoShowPeers: Dispatch<SetStateAction<boolean>>
  setNumberOfPeers: Dispatch<SetStateAction<number>>
  setTitle: Dispatch<SetStateAction<string>>
  showAlert: (message: string, options?: AlertOptions) => void
  isPrivateRoom: boolean
  setIsPrivateRoom: Dispatch<SetStateAction<boolean>>
  roomId: string | null
  setRoomId: Dispatch<SetStateAction<string | null>>
  isPeerListOpen: boolean
  setIsPeerListOpen: Dispatch<SetStateAction<boolean>>
  peerList: Peer[]
  setPeerList: Dispatch<SetStateAction<Peer[]>>
  audioState: AudioState
  setAudioState: Dispatch<SetStateAction<AudioState>>
  videoState: VideoState
  setVideoState: Dispatch<SetStateAction<VideoState>>
  screenState: ScreenShareState
  setScreenState: Dispatch<SetStateAction<ScreenShareState>>
}

export const ShellContext = createContext<ShellContextProps>({
  numberOfPeers: 1,
  tabHasFocus: true,
  setDoShowPeers: () => {},
  setNumberOfPeers: () => {},
  setTitle: () => {},
  showAlert: () => {},
  isPrivateRoom: false,
  setIsPrivateRoom: () => {},
  roomId: null,
  setRoomId: () => {},
  isPeerListOpen: false,
  setIsPeerListOpen: () => {},
  peerList: [],
  setPeerList: () => {},
  audioState: AudioState.STOPPED,
  setAudioState: () => {},
  videoState: VideoState.STOPPED,
  setVideoState: () => {},
  screenState: ScreenShareState.NOT_SHARING,
  setScreenState: () => {},
})
