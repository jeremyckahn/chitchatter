import { createContext, Dispatch, SetStateAction } from 'react'

interface ShellContextProps {
  setTitle: Dispatch<SetStateAction<string>>
}

export const ShellContext = createContext<ShellContextProps>({
  setTitle: () => {},
})
