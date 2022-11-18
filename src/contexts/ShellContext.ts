import { createContext, Dispatch, SetStateAction } from 'react'

import { AlertOptions } from 'models/shell'
import {
  AudioState,
  FileShareState,
  ScreenShareState,
  VideoState,
  Peer,
} from 'models/chat'

interface ShellContextProps {
  numberOfPeers: number
  tabHasFocus: boolean
  setDoShowPeers: Dispatch<SetStateAction<boolean>>
  setNumberOfPeers: Dispatch<SetStateAction<number>>
  setTitle: Dispatch<SetStateAction<string>>
  showAlert: (message: string, options?: AlertOptions) => void
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
  fileShareState: FileShareState
  setFileShareState: Dispatch<SetStateAction<FileShareState>>
}

export const ShellContext = createContext<ShellContextProps>({
  numberOfPeers: 1,
  tabHasFocus: true,
  setDoShowPeers: () => {},
  setNumberOfPeers: () => {},
  setTitle: () => {},
  showAlert: () => {},
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
  fileShareState: FileShareState.NOT_SHARING,
  setFileShareState: () => {},
})
