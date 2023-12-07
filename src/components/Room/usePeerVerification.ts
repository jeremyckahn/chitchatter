import { useContext } from 'react'
import { ShellContext } from 'contexts/ShellContext'
import { Peer, PeerVerificationState } from 'models/chat'
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
  const { updatePeer, peerList } = useContext(ShellContext)

  const [sendVerificationTokenEncrypted, receiveVerificationTokenEncrypted] =
    peerRoom.makeAction<ArrayBuffer>(PeerActions.VERIFICATION_TOKEN_ENCRYPTED)

  const [sendVerificationTokenRaw, receiveVerificationTokenRaw] =
    peerRoom.makeAction<string>(PeerActions.VERIFICATION_TOKEN_RAW)

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
  }

  receiveVerificationTokenEncrypted(
    async (encryptedVerificationToken, peerId) => {
      try {
        const decryptedVerificationToken =
          await encryptionService.decryptString(
            privateKey,
            encryptedVerificationToken
          )

        await sendVerificationTokenRaw(decryptedVerificationToken, [peerId])
      } catch (e) {
        // FIXME: Surface error to the user
        console.error(e)
      }
    }
  )

  receiveVerificationTokenRaw((decryptedVerificationToken, peerId) => {
    const matchingPeer = peerList.find(peer => peer.peerId === peerId)

    if (!matchingPeer) {
      throw new Error(`peerId not found: ${peerId}`)
    }

    if (decryptedVerificationToken !== matchingPeer.verificationToken) {
      updatePeer(peerId, {
        verificationState: PeerVerificationState.UNVERIFIED,
      })

      // FIXME: Surface error to the user
      throw new Error(
        `Verification token for peerId ${peerId} does not match. [expected: ${matchingPeer.verificationToken}] [received: ${decryptedVerificationToken}]`
      )
    }

    updatePeer(peerId, { verificationState: PeerVerificationState.VERIFIED })
  })

  return { verifyPeer }
}
