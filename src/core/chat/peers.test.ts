import { beforeAll, describe, expect, it } from 'vitest'

import {
  applyPeerUpdate,
  createPeer,
  findPeer,
  reconcilePeerMetadata,
  removePeer,
} from 'core/chat/peers'
import { encryption } from 'core/crypto/Encryption'
import {
  AudioChannelName,
  AudioState,
  Peer,
  PeerVerificationState,
  ScreenShareState,
  VideoState,
} from 'core/models/chat'

let publicKey: CryptoKey

beforeAll(async () => {
  publicKey = (await encryption.generateKeyPair()).publicKey
})

const peerFor = (peerId: string, overrides: Partial<Peer> = {}): Peer => ({
  ...createPeer({
    peerId,
    userId: `${peerId}-user`,
    customUsername: '',
    publicKey,
    verificationState: PeerVerificationState.VERIFIED,
  }),
  ...overrides,
})

describe('createPeer', () => {
  it('starts a peer with all media stopped and nothing offered', () => {
    const peer = createPeer({
      peerId: 'peer-1',
      userId: 'user-1',
      customUsername: 'Ada',
      publicKey,
      verificationState: PeerVerificationState.VERIFIED,
    })

    expect(peer).toEqual({
      peerId: 'peer-1',
      userId: 'user-1',
      customUsername: 'Ada',
      publicKey,
      audioChannelState: {
        [AudioChannelName.MICROPHONE]: AudioState.STOPPED,
        [AudioChannelName.SCREEN_SHARE]: AudioState.STOPPED,
      },
      videoState: VideoState.STOPPED,
      screenShareState: ScreenShareState.NOT_SHARING,
      offeredFileId: null,
      isTypingGroupMessage: false,
      isTypingDirectMessage: false,
      verificationState: PeerVerificationState.VERIFIED,
    })
  })
})

describe('applyPeerUpdate', () => {
  it('merges updates into the named peer only', () => {
    const peers = [peerFor('a'), peerFor('b')]
    const updated = applyPeerUpdate(peers, 'b', {
      isTypingGroupMessage: true,
    })

    expect(updated[0].isTypingGroupMessage).toBe(false)
    expect(updated[1].isTypingGroupMessage).toBe(true)
  })

  it('ignores an unknown peer', () => {
    const peers = [peerFor('a')]

    expect(applyPeerUpdate(peers, 'nobody', { customUsername: 'x' })).toEqual(
      peers
    )
  })

  it('does not mutate the list or its peers', () => {
    const peers = [peerFor('a')]

    applyPeerUpdate(peers, 'a', { customUsername: 'changed' })

    expect(peers[0].customUsername).toBe('')
  })
})

describe('removePeer / findPeer', () => {
  it('removes the named peer and leaves the others', () => {
    const peers = [peerFor('a'), peerFor('b')]

    expect(removePeer(peers, 'a').map(({ peerId }) => peerId)).toEqual(['b'])
  })

  it('ignores an unknown peer', () => {
    const peers = [peerFor('a')]

    expect(removePeer(peers, 'nobody')).toEqual(peers)
  })

  it('finds a peer, or returns null', () => {
    const peers = [peerFor('a')]

    expect(findPeer(peers, 'a')?.peerId).toBe('a')
    expect(findPeer(peers, 'nobody')).toBeNull()
  })
})

describe('reconcilePeerMetadata', () => {
  it('adds an unknown peer and reports it', () => {
    const { peers, addedPeer, rename } = reconcilePeerMetadata([], {
      peerId: 'peer-1',
      userId: 'user-1',
      customUsername: 'Ada',
      publicKey,
      verificationState: PeerVerificationState.VERIFIED,
    })

    expect(peers).toHaveLength(1)
    expect(addedPeer?.peerId).toBe('peer-1')
    expect(rename).toBeNull()
  })

  it('updates a known peer without reporting it as added', () => {
    const existing = [peerFor('peer-1', { customUsername: 'Ada' })]
    const { peers, addedPeer } = reconcilePeerMetadata(existing, {
      peerId: 'peer-1',
      userId: 'peer-1-user',
      customUsername: 'Ada',
      publicKey,
      verificationState: PeerVerificationState.UNVERIFIED,
    })

    expect(peers).toHaveLength(1)
    expect(addedPeer).toBeNull()
    expect(peers[0].verificationState).toBe(PeerVerificationState.UNVERIFIED)
  })

  it('reports a rename when the custom username changes', () => {
    const existing = [peerFor('peer-1', { customUsername: 'Ada' })]
    const { peers, rename } = reconcilePeerMetadata(existing, {
      peerId: 'peer-1',
      userId: 'peer-1-user',
      customUsername: 'Grace',
      publicKey,
      verificationState: PeerVerificationState.VERIFIED,
    })

    expect(rename).toEqual({
      peerId: 'peer-1',
      previousUserId: 'peer-1-user',
      userId: 'peer-1-user',
    })
    expect(peers[0].customUsername).toBe('Grace')
  })

  it('reports a rename when a custom username is cleared', () => {
    const existing = [peerFor('peer-1', { customUsername: 'Ada' })]
    const { rename } = reconcilePeerMetadata(existing, {
      peerId: 'peer-1',
      userId: 'peer-1-user',
      customUsername: '',
      publicKey,
      verificationState: PeerVerificationState.VERIFIED,
    })

    expect(rename).not.toBeNull()
  })

  it('does not report a rename when nothing changed', () => {
    const existing = [peerFor('peer-1', { customUsername: 'Ada' })]
    const { rename } = reconcilePeerMetadata(existing, {
      peerId: 'peer-1',
      userId: 'peer-1-user',
      customUsername: 'Ada',
      publicKey,
      verificationState: PeerVerificationState.VERIFIED,
    })

    expect(rename).toBeNull()
  })

  it('preserves media and typing state across a metadata update', () => {
    const existing = [
      peerFor('peer-1', {
        videoState: VideoState.PLAYING,
        isTypingGroupMessage: true,
        offeredFileId: 'magnet:a',
      }),
    ]
    const { peers } = reconcilePeerMetadata(existing, {
      peerId: 'peer-1',
      userId: 'peer-1-user',
      customUsername: 'Ada',
      publicKey,
      verificationState: PeerVerificationState.VERIFIED,
    })

    expect(peers[0].videoState).toBe(VideoState.PLAYING)
    expect(peers[0].isTypingGroupMessage).toBe(true)
    expect(peers[0].offeredFileId).toBe('magnet:a')
  })
})
