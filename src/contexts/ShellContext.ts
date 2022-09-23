import { createContext, Dispatch, SetStateAction } from 'react'

import { AlertOptions } from 'models/shell'

interface ShellContextProps {
  numberOfPeers: number
  tabHasFocus: boolean
  setDoShowPeers: Dispatch<SetStateAction<boolean>>
  setNumberOfPeers: Dispatch<SetStateAction<number>>
  setTitle: Dispatch<SetStateAction<string>>
  showAlert: (message: string, options?: AlertOptions) => void
}

export const ShellContext = createContext<ShellContextProps>({
  numberOfPeers: 1,
  tabHasFocus: true,
  setDoShowPeers: () => {},
  setNumberOfPeers: () => {},
  setTitle: () => {},
  showAlert: () => {},
})
