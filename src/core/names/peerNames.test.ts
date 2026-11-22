import { beforeAll, describe, expect, it } from 'vitest'

import { createPeer } from 'core/chat/peers'
import { encryption } from 'core/crypto/Encryption'
import { Peer, PeerVerificationState } from 'core/models/chat'
import {
  findUserIdsSharingPeerName,
  getCustomUsername,
  getDisplayUsername,
  getFriendlyName,
  getPeerFingerprint,
  getPeerName,
  isPeerSelf,
  NameResolutionContext,
} from 'core/names/peerNames'
import { deriveUserIdFromKey } from 'core/chat/identity'
import { findCollidingUserIds } from 'test-utils/peerNames'

let publicKey: CryptoKey

beforeAll(async () => {
  publicKey = (await encryption.generateKeyPair()).publicKey
})

const peerWith = (userId: string, customUsername: string): Peer =>
  createPeer({
    peerId: `${userId}-peer`,
    userId,
    customUsername,
    publicKey,
    verificationState: PeerVerificationState.VERIFIED,
  })

const contextWith = (peers: Peer[]): NameResolutionContext => ({
  selfUserId: 'self',
  selfCustomUsername: '',
  peers,
})

describe('getPeerName', () => {
  it('is deterministic for a user id', () => {
    expect(getPeerName('user-1')).toBe(getPeerName('user-1'))
  })

  it('differs between user ids', () => {
    expect(getPeerName('user-1')).not.toBe(getPeerName('user-2'))
  })
})

describe('isPeerSelf', () => {
  it('recognizes the local user', () => {
    expect(isPeerSelf('self', contextWith([]))).toBe(true)
    expect(isPeerSelf('somebody', contextWith([]))).toBe(false)
  })
})

describe('getCustomUsername', () => {
  it("reads the local user's own custom username", () => {
    expect(
      getCustomUsername('self', {
        ...contextWith([]),
        selfCustomUsername: 'Me',
      })
    ).toBe('Me')
  })

  it("reads a peer's custom username", () => {
    expect(
      getCustomUsername('user-1', contextWith([peerWith('user-1', 'Ada')]))
    ).toBe('Ada')
  })

  it('is empty for an unknown user', () => {
    expect(getCustomUsername('nobody', contextWith([]))).toBe('')
  })
})

describe('getFriendlyName', () => {
  it('prefers a custom username', () => {
    expect(
      getFriendlyName('user-1', contextWith([peerWith('user-1', 'Ada')]))
    ).toBe('Ada')
  })

  it('falls back to the generated name', () => {
    expect(
      getFriendlyName('user-1', contextWith([peerWith('user-1', '')]))
    ).toBe(getPeerName('user-1'))
  })
})

describe('getDisplayUsername', () => {
  it('shows the generated name alongside a custom one', () => {
    expect(
      getDisplayUsername('user-1', contextWith([peerWith('user-1', 'Ada')]))
    ).toBe(`Ada (${getPeerName('user-1')})`)
  })

  it('shows only the generated name when there is no custom username', () => {
    expect(
      getDisplayUsername('user-1', contextWith([peerWith('user-1', '')]))
    ).toBe(getPeerName('user-1'))
  })

  it('shows only the generated name for an unknown user', () => {
    expect(getDisplayUsername('nobody', contextWith([]))).toBe(
      getPeerName('nobody')
    )
  })
})

describe('getPeerFingerprint', () => {
  const userId =
    'c62a8abe32b443bb9717f6f9e2e335ada1b2c3d4e5f60718293a4b5c6d7e8f90'

  it('shows the first 64 bits of a key-derived user id, grouped', () => {
    expect(getPeerFingerprint(userId)).toBe('c62a 8abe 32b4 43bb')
  })

  it('fingerprints the user id the app derives from a real key', async () => {
    const derivedUserId = await deriveUserIdFromKey(encryption, publicKey)

    expect(getPeerFingerprint(derivedUserId)).toMatch(
      /^[0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4}$/
    )
  })

  it.each([
    ['a non-hex id', 'user-1'],
    ['a UUID', 'c62a8abe-32b4-43bb-9717-46f9e2e335ad'],
    ['uppercase hex', userId.toUpperCase()],
    ['a hex id that is too short', userId.slice(0, 63)],
    ['a hex id that is too long', `${userId}0`],
  ])('is null for %s, which no key derives', (_, notKeyDerived) => {
    expect(getPeerFingerprint(notKeyDerived)).toBeNull()
  })

  it('tells apart users whose generated names collide', () => {
    // Regression: a generated name can be matched by brute force, so it cannot
    // be what tells two users apart.
    const [userId1, userId2] = findCollidingUserIds()

    expect(getPeerName(userId1)).toBe(getPeerName(userId2))
    expect(getPeerFingerprint(userId1)).not.toBe(getPeerFingerprint(userId2))
  })
})

describe('findUserIdsSharingPeerName', () => {
  const [userId1, userId2] = findCollidingUserIds()

  it('is empty when every name is distinct', () => {
    expect(
      findUserIdsSharingPeerName({
        selfCustomUsername: '',
        selfUserId: 'self',
        peers: [peerWith('user-1', ''), peerWith('user-2', '')],
      }).size
    ).toBe(0)
  })

  it('flags two peers that share a generated name', () => {
    const shared = findUserIdsSharingPeerName({
      selfCustomUsername: '',
      selfUserId: 'self',
      peers: [peerWith(userId1, ''), peerWith(userId2, '')],
    })

    expect([...shared].sort()).toEqual([userId1, userId2].sort())
  })

  it("flags a peer that shares the local user's generated name", () => {
    const shared = findUserIdsSharingPeerName({
      selfCustomUsername: '',
      selfUserId: userId1,
      peers: [peerWith(userId2, '')],
    })

    expect([...shared].sort()).toEqual([userId1, userId2].sort())
  })

  it('flags a shared generated name even behind custom usernames', () => {
    // The generated name is shown next to a custom one, so it still collides.
    const shared = findUserIdsSharingPeerName({
      selfCustomUsername: '',
      selfUserId: 'self',
      peers: [peerWith(userId1, 'Ada'), peerWith(userId2, 'Grace')],
    })

    expect(shared.has(userId1)).toBe(true)
    expect(shared.has(userId2)).toBe(true)
  })

  it('does not flag one user connected twice', () => {
    expect(
      findUserIdsSharingPeerName({
        selfCustomUsername: '',
        selfUserId: userId1,
        peers: [peerWith(userId1, ''), peerWith(userId1, '')],
      }).size
    ).toBe(0)
  })
  it('flags two peers that chose the same custom username', () => {
    // Regression: a custom username costs nothing to copy, and a copied one
    // was not flagged because only generated names were compared.
    const shared = findUserIdsSharingPeerName({
      ...contextWith([
        peerWith('user-1', 'Alice'),
        peerWith('user-2', 'Alice'),
      ]),
    })

    expect([...shared].sort()).toEqual(['user-1', 'user-2'])
  })

  it("flags a peer that copied the local user's custom username", () => {
    const shared = findUserIdsSharingPeerName({
      ...contextWith([peerWith('user-1', 'Alice')]),
      selfCustomUsername: 'Alice',
    })

    expect([...shared].sort()).toEqual(['self', 'user-1'])
  })

  it('compares custom usernames ignoring case, spacing and width', () => {
    const shared = findUserIdsSharingPeerName(
      contextWith([
        peerWith('user-1', 'Alice  Smith'),
        peerWith('user-2', ' alice smith '),
        peerWith('user-3', 'Ａｌｉｃｅ Smith'),
      ])
    )

    expect([...shared].sort()).toEqual(['user-1', 'user-2', 'user-3'])
  })

  it.each([
    ['a zero-width space', 'Ali\u200Bce'],
    ['a zero-width joiner', 'Ali\u200Dce'],
    ['a zero-width non-joiner', 'Ali\u200Cce'],
    ['a soft hyphen', 'Ali\u00ADce'],
    ['a byte order mark', '\uFEFFAlice'],
    ['a right-to-left override', '\u202EAlice\u202C'],
    ['a word joiner', 'Alice\u2060'],
  ])(
    'flags a custom username that differs only by %s',
    (_description, disguisedName) => {
      // Regression: invisible characters made a copied name compare unequal
      // while it looked identical on screen.
      const shared = findUserIdsSharingPeerName(
        contextWith([
          peerWith('user-1', 'Alice'),
          peerWith('user-2', disguisedName),
        ])
      )

      expect([...shared].sort()).toEqual(['user-1', 'user-2'])
    }
  )

  it('flags a generated name copied with invisible characters inside it', () => {
    const generatedName = getPeerName('user-1')
    const disguisedName = generatedName.replace(' ', '\u200B \u200B')
    const shared = findUserIdsSharingPeerName(
      contextWith([peerWith('user-1', ''), peerWith('user-2', disguisedName)])
    )

    expect([...shared].sort()).toEqual(['user-1', 'user-2'])
  })

  it('ignores custom usernames made only of invisible characters', () => {
    expect(
      findUserIdsSharingPeerName(
        contextWith([
          peerWith('user-1', '\u200B'),
          peerWith('user-2', '\u200B\u200D'),
        ])
      ).size
    ).toBe(0)
  })

  it("flags a custom username that copies another user's generated name", () => {
    const shared = findUserIdsSharingPeerName(
      contextWith([
        peerWith('user-1', ''),
        peerWith('user-2', getPeerName('user-1')),
      ])
    )

    expect([...shared].sort()).toEqual(['user-1', 'user-2'])
  })

  it('does not flag a user whose custom username is their own generated name', () => {
    expect(
      findUserIdsSharingPeerName(
        contextWith([peerWith('user-1', getPeerName('user-1'))])
      ).size
    ).toBe(0)
  })

  it('does not flag one user connected twice under different custom usernames', () => {
    expect(
      findUserIdsSharingPeerName(
        contextWith([peerWith('user-1', 'Ada'), peerWith('user-1', 'Grace')])
      ).size
    ).toBe(0)
  })

  it('ignores blank custom usernames', () => {
    expect(
      findUserIdsSharingPeerName(
        contextWith([peerWith('user-1', '  '), peerWith('user-2', '  ')])
      ).size
    ).toBe(0)
  })
})
