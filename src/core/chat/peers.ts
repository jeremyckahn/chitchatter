import {
  AudioChannelName,
  AudioState,
  Peer,
  PeerVerificationState,
  ScreenShareState,
  VideoState,
} from 'core/models/chat'

export const createPeer = ({
  peerId,
  userId,
  customUsername,
  publicKey,
  verificationState,
}: {
  peerId: string
  userId: string
  customUsername: string
  publicKey: CryptoKey
  verificationState: PeerVerificationState
}): Peer => ({
  peerId,
  userId,
  publicKey,
  customUsername,
  audioChannelState: {
    [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
    [AudioChannelName.SCREEN_SHARE]: AudioState.STOPPED,
  },
  videoState: VideoState.STOPPED,
  screenShareState: ScreenShareState.NOT_SHARING,
  offeredFileId: null,
  isTypingGroupMessage: false,
  isTypingDirectMessage: false,
  verificationState,
})

/** Merges `updates` into the named peer. Unknown peers are ignored. */
export const applyPeerUpdate = (
  peers: readonly Peer[],
  peerId: string,
  updates: Partial<Peer>
): Peer[] =>
  peers.map(peer => (peer.peerId === peerId ? { ...peer, ...updates } : peer))

export const removePeer = (peers: readonly Peer[], peerId: string): Peer[] =>
  peers.filter(peer => peer.peerId !== peerId)

export const findPeer = (peers: readonly Peer[], peerId: string) =>
  peers.find(peer => peer.peerId === peerId) ?? null

export interface PeerMetadataReconciliation {
  peers: Peer[]
  /** Set when this metadata introduced a peer the list had not seen. */
  addedPeer: Peer | null
  /**
   * Set when a known peer changed its advertised username, so the caller can
   * decide whether and how to announce it. The core does not word the
   * announcement — that is presentation.
   */
  rename: { peerId: string; previousUserId: string; userId: string } | null
}

/**
 * Folds an incoming PEER_METADATA payload into the peer list, reporting what
 * changed so the caller can react without diffing the list itself.
 */
export const reconcilePeerMetadata = (
  peers: readonly Peer[],
  {
    peerId,
    userId,
    customUsername,
    publicKey,
    verificationState,
  }: {
    peerId: string
    userId: string
    customUsername: string
    publicKey: CryptoKey
    verificationState: PeerVerificationState
  }
): PeerMetadataReconciliation => {
  const existing = findPeer(peers, peerId)

  if (!existing) {
    const addedPeer = createPeer({
      peerId,
      userId,
      customUsername,
      publicKey,
      verificationState,
    })

    return { peers: [...peers, addedPeer], addedPeer, rename: null }
  }

  const hasRenamed =
    existing.customUsername !== customUsername || existing.userId !== userId

  return {
    peers: applyPeerUpdate(peers, peerId, {
      userId,
      customUsername,
      publicKey,
      verificationState,
    }),
    addedPeer: null,
    rename: hasRenamed
      ? { peerId, previousUserId: existing.userId, userId }
      : null,
  }
}
