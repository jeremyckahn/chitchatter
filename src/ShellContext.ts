import { createContext, Dispatch, SetStateAction } from 'react'

import { AlertOptions } from 'models/shell'

interface ShellContextProps {
  numberOfPeers: number
  setNumberOfPeers: Dispatch<SetStateAction<number>>
  setTitle: Dispatch<SetStateAction<string>>
  showAlert: (message: string, options?: AlertOptions) => void
}

export const ShellContext = createContext<ShellContextProps>({
  numberOfPeers: 1,
  setNumberOfPeers: () => {},
  setTitle: () => {},
  showAlert: () => {},
})
