import {
  createContext,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react'

import { ConnectionTestResults } from 'components/Shell/useConnectionTest'
import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomRegistry } from 'core/chat/ChatRoomRegistry'
import {
  AudioChannelName,
  AudioState,
  Peer,
  PeerAudioChannelState,
  ScreenShareState,
  VideoState,
} from 'core/models/chat'
import { PeerConnectionType } from 'core/transport/types'
import { TrysteroTransport } from 'core/transport/TrysteroTransport'
import { TrackerConnection } from 'lib/ConnectionTest'
import { AudioChannel } from 'models/media'
import { AlertOptions } from 'models/shell'

export interface ShellContextProps {
  // --- presentation state, owned here
  isEmbedded: boolean
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
  isServerConnectionFailureDialogOpen: boolean
  setIsServerConnectionFailureDialogOpen: Dispatch<SetStateAction<boolean>>
  connectionTestResults: ConnectionTestResults
  customUsername: string
  setCustomUsername: Dispatch<SetStateAction<string>>

  // --- web-only media state, owned here because the core has no business with
  // MediaStreams or HTMLAudioElements
  audioChannelState: PeerAudioChannelState
  setAudioChannelState: Dispatch<SetStateAction<PeerAudioChannelState>>
  videoState: VideoState
  setVideoState: Dispatch<SetStateAction<VideoState>>
  screenState: ScreenShareState
  setScreenState: Dispatch<SetStateAction<ScreenShareState>>
  peerAudioChannels: Record<string, AudioChannel>
  setPeerAudioChannels: Dispatch<SetStateAction<Record<string, AudioChannel>>>

  // --- application state, read through the active ChatRoom rather than
  // duplicated here. `peerList` and `peerConnectionTypes` are snapshots of the
  // core's state, not React state of their own.
  chatRoom: ChatRoom | null
  registerChatRoom: (chatRoom: ChatRoom | null) => void
  chatRoomRegistry: ChatRoomRegistry
  transportRef: MutableRefObject<TrysteroTransport | null>
  peerList: readonly Peer[]
  updatePeer: (peerId: string, updatedProperties: Partial<Peer>) => void
  peerConnectionTypes: Readonly<Record<string, PeerConnectionType>>
}

export const ShellContext = createContext<ShellContextProps>({
  isEmbedded: false,
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
  isServerConnectionFailureDialogOpen: false,
  setIsServerConnectionFailureDialogOpen: () => {},
  connectionTestResults: {
    hasHost: false,
    hasTURNServer: false,
    trackerConnection: TrackerConnection.SEARCHING,
  },
  customUsername: '',
  setCustomUsername: () => {},
  audioChannelState: {
    [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
    [AudioChannelName.SCREEN_SHARE]: AudioState.STOPPED,
  },
  setAudioChannelState: () => {},
  videoState: VideoState.STOPPED,
  setVideoState: () => {},
  screenState: ScreenShareState.NOT_SHARING,
  setScreenState: () => {},
  peerAudioChannels: {},
  setPeerAudioChannels: () => {},
  chatRoom: null,
  registerChatRoom: () => {},
  chatRoomRegistry: new ChatRoomRegistry(),
  transportRef: { current: null },
  peerList: [],
  updatePeer: () => {},
  peerConnectionTypes: {},
})
