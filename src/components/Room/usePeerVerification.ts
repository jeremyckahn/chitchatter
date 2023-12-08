import { useContext, useRef } from 'react'
import { ShellContext } from 'contexts/ShellContext'
import { Peer, PeerVerificationState } from 'models/chat'
import { encryptionService as encryptionServiceInstance } from 'services/Encryption'
import { PeerRoom } from 'services/PeerRoom'
import { PeerActions } from 'models/network'
import { verificationTimeout } from 'config/messaging'

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

  const verificationTimersRef = useRef<Record<Peer['peerId'], NodeJS.Timeout>>(
    {}
  )

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

    const verificationTimer = setTimeout(() => {
      updatePeer(peer.peerId, {
        verificationState: PeerVerificationState.UNVERIFIED,
      })

      delete verificationTimersRef.current[peer.peerId]

      console.warn(`Verification for peerId ${peer.peerId} timed out`)
    }, verificationTimeout)

    verificationTimersRef.current[peer.peerId] = verificationTimer

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

    const { verificationToken } = matchingPeer

    if (decryptedVerificationToken !== verificationToken) {
      updatePeer(peerId, {
        verificationState: PeerVerificationState.UNVERIFIED,
      })

      // FIXME: Surface error to the user
      throw new Error(
        `Verification token for peerId ${peerId} does not match. [expected: ${verificationToken}] [received: ${decryptedVerificationToken}]`
      )
    }

    const verificationTimer = verificationTimersRef.current[peerId]

    if (verificationTimer) {
      clearTimeout(verificationTimer)
    }

    delete verificationTimersRef.current[peerId]

    updatePeer(peerId, {
      verificationState: PeerVerificationState.VERIFIED,
    })
  })

  return { verifyPeer }
}
