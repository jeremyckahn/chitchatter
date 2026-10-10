import { render, screen } from '@testing-library/react'

import { SettingsContext } from 'contexts/SettingsContext'
import { ChatRoom } from 'core/chat/ChatRoom'
import { createPeer } from 'core/chat/peers'
import { Peer, PeerVerificationState } from 'core/models/chat'
import { getPeerName } from 'core/names/peerNames'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { TypingStatusBar } from './TypingStatusBar'

const userSettingsStub = userSettingsContextStubFactory({ userId: 'self' })

const createTypingPeer = (userId: string, updates: Partial<Peer>): Peer => ({
  ...createPeer({
    peerId: `peer-${userId}`,
    userId,
    customUsername: '',
    publicKey: {} as CryptoKey,
    verificationState: PeerVerificationState.VERIFIED,
  }),
  ...updates,
})

/**
 * The bar reads from the room it is rendered for, not from the shell's peer
 * list: the shell only ever holds the group room's peers, so a direct-message
 * room's typing status would be invisible if it read from there.
 */
const createChatRoomStub = (peers: readonly Peer[]) =>
  ({
    getPeers: () => peers,
    on: () => () => {},
  }) as unknown as ChatRoom

const renderStatusBar = (
  peers: readonly Peer[],
  isDirectMessageRoom: boolean
) =>
  render(
    <SettingsContext.Provider value={userSettingsStub}>
      <TypingStatusBar
        chatRoom={createChatRoomStub(peers)}
        isDirectMessageRoom={isDirectMessageRoom}
      />
    </SettingsContext.Provider>
  )

describe('TypingStatusBar', () => {
  test('reports the peer typing in a direct-message room', () => {
    const { container } = renderStatusBar(
      [createTypingPeer('friend', { isTypingDirectMessage: true })],
      true
    )

    expect(screen.getByText(getPeerName('friend'))).toBeInTheDocument()
    expect(container).toHaveTextContent('is typing...')
  })

  test('reports the peers typing in a group room', () => {
    const { container } = renderStatusBar(
      [
        createTypingPeer('one', { isTypingGroupMessage: true }),
        createTypingPeer('two', { isTypingGroupMessage: true }),
      ],
      false
    )

    expect(container).toHaveTextContent('are typing...')
  })

  test('ignores a peer typing in the other kind of room', () => {
    const { container } = renderStatusBar(
      [createTypingPeer('friend', { isTypingGroupMessage: true })],
      true
    )

    expect(container).not.toHaveTextContent('typing')
  })
})
