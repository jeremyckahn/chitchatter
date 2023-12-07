import { useContext } from 'react'
import { ShellContext } from 'contexts/ShellContext'
import { Peer } from 'models/chat'
import { encryptionService } from 'services/Encryption'

export const usePeerVerification = () => {
  const { updatePeer } = useContext(ShellContext)

  const verifyPeer = async (peer: Peer) => {
    const { verificationToken } = peer

    const encryptedVerificationToken = await encryptionService.encryptString(
      peer.publicKey,
      verificationToken
    )

    updatePeer(peer.peerId, { encryptedVerificationToken })

    // FIXME: Send hashed token to peer

    // FIXME: Wait for token response from peer

    // FIXME: Mark the peer as verified
  }

  return { verifyPeer }
}
