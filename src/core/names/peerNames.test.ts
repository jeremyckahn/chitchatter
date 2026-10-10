import { beforeAll, describe, expect, it } from 'vitest'

import { createPeer } from 'core/chat/peers'
import { encryption } from 'core/crypto/Encryption'
import { Peer, PeerVerificationState } from 'core/models/chat'
import {
  getCustomUsername,
  getDisplayUsername,
  getFriendlyName,
  getPeerName,
  isPeerSelf,
  NameResolutionContext,
} from 'core/names/peerNames'

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
