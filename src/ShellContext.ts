import { createContext, Dispatch, SetStateAction } from 'react'

interface ShellContextProps {
  setTitle: Dispatch<SetStateAction<string>>
  setNumberOfPeers: Dispatch<SetStateAction<number>>
  numberOfPeers: number
}

export const ShellContext = createContext<ShellContextProps>({
  setTitle: () => {},
  setNumberOfPeers: () => {},
  numberOfPeers: 1,
})
