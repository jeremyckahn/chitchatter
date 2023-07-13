import { createContext, Dispatch, SetStateAction } from 'react'

import { AlertOptions } from 'models/shell'
import { AudioState, ScreenShareState, VideoState, Peer } from 'models/chat'
import { PeerConnectionType } from 'services/PeerRoom/PeerRoom'
import { ConnectionTestResults } from 'components/Shell/useConnectionTest'

interface ShellContextProps {
  tabHasFocus: boolean
  showRoomControls: boolean
  setShowRoomControls: Dispatch<SetStateAction<boolean>>
  setTitle: Dispatch<SetStateAction<string>>
  showAlert: (message: string, options?: AlertOptions) => void
  roomId?: string
  setRoomId: Dispatch<SetStateAction<string | undefined>>
  password?: string
  setPassword: Dispatch<SetStateAction<string | undefined>>
  isPeerListOpen: boolean
  setIsPeerListOpen: Dispatch<SetStateAction<boolean>>
  peerList: Peer[]
  setPeerList: Dispatch<SetStateAction<Peer[]>>
  peerConnectionTypes: Record<string, PeerConnectionType>
  setPeerConnectionTypes: Dispatch<
    SetStateAction<Record<string, PeerConnectionType>>
  >
  audioState: AudioState
  setAudioState: Dispatch<SetStateAction<AudioState>>
  videoState: VideoState
  setVideoState: Dispatch<SetStateAction<VideoState>>
  screenState: ScreenShareState
  setScreenState: Dispatch<SetStateAction<ScreenShareState>>
  peerAudios: Record<string, HTMLAudioElement>
  setPeerAudios: Dispatch<SetStateAction<Record<string, HTMLAudioElement>>>
  customUsername: string
  setCustomUsername: Dispatch<SetStateAction<string>>
  connectionTestResults: ConnectionTestResults
}

export const ShellContext = createContext<ShellContextProps>({
  tabHasFocus: true,
  showRoomControls: false,
  setShowRoomControls: () => {},
  setTitle: () => {},
  showAlert: () => {},
  roomId: undefined,
  setRoomId: () => {},
  password: undefined,
  setPassword: () => {},
  isPeerListOpen: false,
  setIsPeerListOpen: () => {},
  peerList: [],
  setPeerList: () => {},
  peerConnectionTypes: {},
  setPeerConnectionTypes: () => {},
  audioState: AudioState.STOPPED,
  setAudioState: () => {},
  videoState: VideoState.STOPPED,
  setVideoState: () => {},
  screenState: ScreenShareState.NOT_SHARING,
  setScreenState: () => {},
  peerAudios: {},
  setPeerAudios: () => {},
  customUsername: '',
  setCustomUsername: () => {},
  connectionTestResults: { hasHost: false, hasRelay: false, hasTracker: false },
})
