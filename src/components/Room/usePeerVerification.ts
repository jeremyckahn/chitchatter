import { useCallback, useContext, useEffect, useState } from 'react'
import { ShellContext } from 'contexts/ShellContext'
import { Peer, PeerVerificationState } from 'models/chat'
import { encryption } from 'services/Encryption'
import { PeerRoom } from 'lib/PeerRoom'
import { PeerActions } from 'models/network'
import { verificationTimeout } from 'config/messaging'
import { usePeerNameDisplay } from 'components/PeerNameDisplay'

interface UserPeerVerificationProps {
  peerRoom: PeerRoom
  privateKey: CryptoKey
  encryptionService?: typeof encryption
}

export const usePeerVerification = ({
  peerRoom,
  privateKey,
  encryptionService = encryption,
}: UserPeerVerificationProps) => {
  const { updatePeer, peerList, showAlert } = useContext(ShellContext)

  const { getDisplayUsername } = usePeerNameDisplay()

  const [sendVerificationTokenEncrypted, receiveVerificationTokenEncrypted] =
    peerRoom.makeAction<ArrayBuffer>(PeerActions.VERIFICATION_TOKEN_ENCRYPTED)

  const [sendVerificationTokenRaw, receiveVerificationTokenRaw] =
    peerRoom.makeAction<string>(PeerActions.VERIFICATION_TOKEN_RAW)

  const initPeerVerification = useCallback(
    async (peer: Peer) => {
      const { verificationToken } = peer

      const encryptedVerificationToken = await encryptionService.encryptString(
        peer.publicKey,
        verificationToken
      )

      const verificationTimer = setTimeout(() => {
        updatePeer(peer.peerId, {
          verificationState: PeerVerificationState.UNVERIFIED,
          verificationTimer: null,
        })

        showAlert(
          `Verification for ${getDisplayUsername(peer.userId)} timed out`,
          {
            severity: 'error',
          }
        )

        console.warn(`Verification for peerId ${peer.peerId} timed out`)
      }, verificationTimeout)

      updatePeer(peer.peerId, { encryptedVerificationToken, verificationTimer })

      await sendVerificationTokenEncrypted(encryptedVerificationToken, [
        peer.peerId,
      ])
    },
    [
      encryptionService,
      getDisplayUsername,
      sendVerificationTokenEncrypted,
      showAlert,
      updatePeer,
    ]
  )

  // NOTE: This useState and useEffect is a hacky workaround for stale data
  // being used when verifying new peers. It would be much simpler to call
  // initPeerVerification directly, but doing so when the peer metadata is
  // received results in peerList being out of date (which is used by
  // getDisplayUsername).
  const [scheduledPeerToVerify, setScheduledPeerToVerify] =
    useState<Peer | null>(null)
  useEffect(() => {
    if (scheduledPeerToVerify === null) return

    initPeerVerification(scheduledPeerToVerify)
    setScheduledPeerToVerify(null)
  }, [scheduledPeerToVerify, initPeerVerification])
  // NOTE: END HACKY WORKAROUND

  const verifyPeer = (peer: Peer) => {
    setScheduledPeerToVerify(peer)
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
        console.error(e)
      }
    }
  )

  receiveVerificationTokenRaw((decryptedVerificationToken, peerId) => {
    const matchingPeer = peerList.find(peer => peer.peerId === peerId)

    if (!matchingPeer) {
      throw new Error(`peerId not found: ${peerId}`)
    }

    const { verificationToken, verificationTimer } = matchingPeer

    if (decryptedVerificationToken !== verificationToken) {
      updatePeer(peerId, {
        verificationState: PeerVerificationState.UNVERIFIED,
        verificationTimer: null,
      })

      showAlert(
        `Verification for ${getDisplayUsername(matchingPeer.userId)} failed`,
        {
          severity: 'error',
        }
      )

      throw new Error(
        `Verification token for peerId ${peerId} does not match. [expected: ${verificationToken}] [received: ${decryptedVerificationToken}]`
      )
    }

    if (verificationTimer) {
      clearTimeout(verificationTimer)
    }

    updatePeer(peerId, {
      verificationState: PeerVerificationState.VERIFIED,
      verificationTimer: null,
    })
  })

  return { verifyPeer }
}
