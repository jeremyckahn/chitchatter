import { createContext, Dispatch, SetStateAction } from 'react'

import { AlertOptions } from 'models/shell'
import { Peer } from 'models/chat'

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
})
