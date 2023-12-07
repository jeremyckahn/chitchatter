import { useContext } from 'react'
import { ShellContext } from 'contexts/ShellContext'
import { Peer } from 'models/chat'
import { encryptionService as encryptionServiceInstance } from 'services/Encryption'
import { PeerRoom } from 'services/PeerRoom'
import { PeerActions } from 'models/network'

interface UserPeerVerificationProps {
  peerRoom: PeerRoom
  privateKey: CryptoKey
  encryptionService?: typeof encryptionServiceInstance
}

export const usePeerVerification = ({
  peerRoom,
  privateKey,
  encryptionService = encryptionServiceInstance,
}: UserPeerVerificationProps) => {
  const { updatePeer } = useContext(ShellContext)

  const [sendVerificationTokenEncrypted, receiveVerificationTokenEncrypted] =
    peerRoom.makeAction<ArrayBuffer>(PeerActions.VERIFICATION_TOKEN_ENCRYPTED)

  const verifyPeer = async (peer: Peer) => {
    const { verificationToken } = peer

    const encryptedVerificationToken = await encryptionService.encryptString(
      peer.publicKey,
      verificationToken
    )

    updatePeer(peer.peerId, { encryptedVerificationToken })

    await sendVerificationTokenEncrypted(encryptedVerificationToken, [
      peer.peerId,
    ])

    // FIXME: Wait for token response from peer

    // FIXME: Mark the peer as verified
  }

  receiveVerificationTokenEncrypted(async encryptedVerificationToken => {
    try {
      const decryptedVerificationToken = await encryptionService.decryptString(
        privateKey,
        encryptedVerificationToken
      )

      // FIXME: Remove this
      console.log({ encryptedVerificationToken, decryptedVerificationToken })
    } catch (e) {
      console.error(e)
    }
  })

  return { verifyPeer }
}
