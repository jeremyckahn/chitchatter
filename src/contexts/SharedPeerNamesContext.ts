import { createContext } from 'react'

const emptySharedPeerNames: ReadonlySet<string> = new Set()

/**
 * The set of user ids in the active room (current peers, the local user, and
 * proven authors in the chat history) whose name is shared with another user
 * id.
 *
 * Computed once per change of peers or history by `SharedPeerNamesProvider`
 * rather than once per rendered message.
 */
export const SharedPeerNamesContext =
  createContext<ReadonlySet<string>>(emptySharedPeerNames)
