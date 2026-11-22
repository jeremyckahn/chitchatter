import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { createPeer } from 'core/chat/peers'
import { encryption } from 'core/crypto/Encryption'
import { AudioChannelName, Peer, PeerVerificationState } from 'core/models/chat'
import { AudioChannel } from 'models/media'

import { useUnlistedPeerAudioMute } from './useUnlistedPeerAudioMute'

const listedPeer = (peerId: string): Peer =>
  createPeer({
    peerId,
    userId: `user-${peerId}`,
    customUsername: '',
    publicKey: encryption.cryptoKeyStub,
    verificationState: PeerVerificationState.VERIFIED,
  })

const audioChannel = (): Required<AudioChannel> => ({
  [AudioChannelName.MICROPHONE]: new Audio(),
  [AudioChannelName.SCREEN_SHARE]: new Audio(),
})

const renderMute = (
  peerList: readonly Peer[],
  peerAudioChannels: Record<string, AudioChannel>
) =>
  renderHook(
    ({ peers, channels }) => useUnlistedPeerAudioMute(peers, channels),
    { initialProps: { peers: peerList, channels: peerAudioChannels } }
  )

describe('useUnlistedPeerAudioMute', () => {
  test('mutes microphone and screen share audio from a peer that is not listed', () => {
    const unlisted = audioChannel()

    renderMute([], { 'peer-1': unlisted })

    expect(unlisted[AudioChannelName.MICROPHONE].muted).toBe(true)
    expect(unlisted[AudioChannelName.SCREEN_SHARE].muted).toBe(true)
  })

  test('leaves audio from a listed peer unmuted', () => {
    const listed = audioChannel()

    renderMute([listedPeer('peer-1')], { 'peer-1': listed })

    expect(listed[AudioChannelName.MICROPHONE].muted).toBe(false)
    expect(listed[AudioChannelName.SCREEN_SHARE].muted).toBe(false)
  })

  test('mutes only the unlisted peer when listed and unlisted peers are both playing', () => {
    const listed = audioChannel()
    const unlisted = audioChannel()

    renderMute([listedPeer('peer-1')], {
      'peer-1': listed,
      'peer-2': unlisted,
    })

    expect(listed[AudioChannelName.MICROPHONE].muted).toBe(false)
    expect(unlisted[AudioChannelName.MICROPHONE].muted).toBe(true)
  })

  test('unmutes audio that arrived before its peer was listed once the peer is listed', () => {
    const earlyAudio = audioChannel()
    const channels = { 'peer-1': earlyAudio }

    const { rerender } = renderMute([], channels)

    expect(earlyAudio[AudioChannelName.MICROPHONE].muted).toBe(true)

    rerender({ peers: [listedPeer('peer-1')], channels })

    expect(earlyAudio[AudioChannelName.MICROPHONE].muted).toBe(false)
    expect(earlyAudio[AudioChannelName.SCREEN_SHARE].muted).toBe(false)
  })

  test('mutes audio that arrives for a peer that is not listed after render', () => {
    const { rerender } = renderMute([listedPeer('peer-1')], {})

    const lateAudio = audioChannel()

    rerender({
      peers: [listedPeer('peer-1')],
      channels: { 'peer-2': lateAudio },
    })

    expect(lateAudio[AudioChannelName.MICROPHONE].muted).toBe(true)
  })

  test('mutes a peer that drops out of the list while its audio is still held', () => {
    const audio = audioChannel()
    const channels = { 'peer-1': audio }

    const { rerender } = renderMute([listedPeer('peer-1')], channels)

    rerender({ peers: [], channels })

    expect(audio[AudioChannelName.MICROPHONE].muted).toBe(true)
  })
})
