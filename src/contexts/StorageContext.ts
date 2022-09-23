import { createContext } from 'react'
import localforage from 'localforage'

interface StorageContextProps {
  getPersistedStorage: () => typeof localforage
}

export const StorageContext = createContext<StorageContextProps>({
  getPersistedStorage: () => localforage,
})
