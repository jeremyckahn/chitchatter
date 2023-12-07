import { useContext } from 'react'
import { ShellContext } from 'contexts/ShellContext'
import { Peer } from 'models/chat'

export const usePeerVerification = () => {
  const { updatePeer } = useContext(ShellContext)

  const verifyPeer = (peer: Peer) => {
    // FIXME: Remove this
    console.log({ peer, updatePeer })

    // FIXME: Create UUID token and store it

    // FIXME: Hash token with publicKey

    // FIXME: Send hashed token to peer

    // FIXME: Wait for token response from peer

    // FIXME: Mark the peer as verified
  }

  return { verifyPeer }
}
