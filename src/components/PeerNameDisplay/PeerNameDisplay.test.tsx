import { act, render, screen } from '@testing-library/react'
import { PropsWithChildren, useContext } from 'react'
import { vi } from 'vitest'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { createPlatformAdapters } from 'core/adapters/noop'
import { ChatRoom } from 'core/chat/ChatRoom'
import { createPeer } from 'core/chat/peers'
import { encryption } from 'core/crypto/Encryption'
import { Peer, PeerVerificationState } from 'core/models/chat'
import * as peerNames from 'core/names/peerNames'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import { mockEncryptionService } from 'test-utils/mocks/mockEncryptionService'
import { findCollidingUserIds } from 'test-utils/peerNames'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { PeerFingerprint, peerFingerprintLabel } from './PeerFingerprint'
import { PeerNameDisplay } from './PeerNameDisplay'
import { SharedPeerNameBadge, sharedPeerNameLabel } from './SharedPeerNameBadge'
import { SharedPeerNamesProvider } from './SharedPeerNamesProvider'

const selfUserId = 'a'.repeat(64)
const [collidingUserId1, collidingUserId2] = findCollidingUserIds()

const createTestPeer = (userId: string, customUsername = ''): Peer =>
  createPeer({
    peerId: `peer-${userId}`,
    userId,
    customUsername,
    publicKey: encryption.cryptoKeyStub,
    verificationState: PeerVerificationState.VERIFIED,
  })

const createWrapper = (
  peerList: readonly Peer[],
  userId = selfUserId,
  customUsername = ''
) => {
  const userSettingsStub = userSettingsContextStubFactory({ userId })

  const Wrapper = ({ children }: PropsWithChildren) => {
    const shellDefaults = useContext(ShellContext)

    return (
      <SettingsContext.Provider value={userSettingsStub}>
        <ShellContext.Provider
          value={{ ...shellDefaults, peerList, customUsername }}
        >
          <SharedPeerNamesProvider>{children}</SharedPeerNamesProvider>
        </ShellContext.Provider>
      </SettingsContext.Provider>
    )
  }

  return Wrapper
}

describe('PeerFingerprint', () => {
  test('shows the fingerprint of a key-derived user id', () => {
    const userId = `0123456789abcdef${'0'.repeat(48)}`

    render(<PeerFingerprint userId={userId} />)

    expect(
      screen.getByLabelText(`${peerFingerprintLabel}: 0123 4567 89ab cdef`)
    ).toHaveTextContent('0123 4567 89ab cdef')
  })

  test('renders nothing for an id that no key derives', () => {
    const { container } = render(<PeerFingerprint userId="not-a-key-id" />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('SharedPeerNameBadge', () => {
  test('warns when two peers share a generated name', () => {
    // Regression: a peer whose key was brute-forced to match another user's
    // generated name was indistinguishable from them in the peer list.
    render(<SharedPeerNameBadge userId={collidingUserId2} />, {
      wrapper: createWrapper([
        createTestPeer(collidingUserId1),
        createTestPeer(collidingUserId2),
      ]),
    })

    expect(screen.getByLabelText(sharedPeerNameLabel)).toBeInTheDocument()
  })

  test("warns when a peer shares the local user's generated name", () => {
    render(<SharedPeerNameBadge userId={collidingUserId2} />, {
      wrapper: createWrapper(
        [createTestPeer(collidingUserId2)],
        collidingUserId1
      ),
    })

    expect(screen.getByLabelText(sharedPeerNameLabel)).toBeInTheDocument()
  })

  test('does not warn about the local user connected in another tab', () => {
    render(<SharedPeerNameBadge userId={collidingUserId1} />, {
      wrapper: createWrapper(
        [createTestPeer(collidingUserId1)],
        collidingUserId1
      ),
    })

    expect(screen.queryByLabelText(sharedPeerNameLabel)).toBeNull()
  })

  test('does not warn when every name is distinct', () => {
    render(<SharedPeerNameBadge userId={collidingUserId1} />, {
      wrapper: createWrapper([createTestPeer(collidingUserId1)]),
    })

    expect(screen.queryByLabelText(sharedPeerNameLabel)).toBeNull()
  })
  test('warns when two peers chose the same custom username', () => {
    // Regression: copying someone's custom username needs no brute force, and
    // it was not flagged because only generated names were compared.
    const userId1 = 'b'.repeat(64)
    const userId2 = 'c'.repeat(64)

    render(<SharedPeerNameBadge userId={userId2} />, {
      wrapper: createWrapper([
        createTestPeer(userId1, 'Alice'),
        createTestPeer(userId2, 'Alice'),
      ]),
    })

    expect(screen.getByLabelText(sharedPeerNameLabel)).toBeInTheDocument()
  })

  test("warns when a peer copies the local user's custom username", () => {
    const peerUserId = 'b'.repeat(64)

    render(<SharedPeerNameBadge userId={peerUserId} />, {
      wrapper: createWrapper(
        [createTestPeer(peerUserId, 'Alice')],
        selfUserId,
        'Alice'
      ),
    })

    expect(screen.getByLabelText(sharedPeerNameLabel)).toBeInTheDocument()
  })
})

describe('SharedPeerNamesProvider', () => {
  test('computes shared names once per change of peers or room history, not once per consumer', async () => {
    const spy = vi.spyOn(peerNames, 'findUserIdsSharingPeerName')
    const userSettingsStub = userSettingsContextStubFactory({
      userId: collidingUserId1,
    })
    let nextId = 0
    const chatRoom = new ChatRoom({
      roomId: 'room-spy',
      userId: collidingUserId1,
      customUsername: '',
      publicKey: encryption.cryptoKeyStub,
      privateKey: encryption.cryptoKeyStub,
      transport: new InMemoryTransport(createInMemoryNetwork(), 'self-peer'),
      encryptionService: mockEncryptionService,
      adapters: createPlatformAdapters({ uuid: () => `msg-${++nextId}` }),
    })

    const initialPeers: readonly Peer[] = [createTestPeer(collidingUserId2)]

    const Harness = ({ peerList }: { peerList: readonly Peer[] }) => {
      const shellDefaults = useContext(ShellContext)

      return (
        <SettingsContext.Provider value={userSettingsStub}>
          <ShellContext.Provider
            value={{ ...shellDefaults, chatRoom, peerList }}
          >
            <SharedPeerNamesProvider>
              <PeerNameDisplay>{collidingUserId1}</PeerNameDisplay>
              <SharedPeerNameBadge userId={collidingUserId1} />
              <PeerNameDisplay>{collidingUserId2}</PeerNameDisplay>
              <SharedPeerNameBadge userId={collidingUserId2} />
              <SharedPeerNameBadge userId={selfUserId} />
            </SharedPeerNamesProvider>
          </ShellContext.Provider>
        </SettingsContext.Provider>
      )
    }

    try {
      const { rerender } = render(<Harness peerList={initialPeers} />)

      expect(screen.getAllByLabelText(sharedPeerNameLabel)).toHaveLength(2)
      expect(spy).toHaveBeenCalledTimes(1)

      // Re-rendering with unchanged peers and room history does not recompute.
      rerender(<Harness peerList={initialPeers} />)
      expect(spy).toHaveBeenCalledTimes(1)

      // Appending to the real ChatRoom's message log triggers one recomputation.
      await act(async () => {
        await chatRoom.sendMessage('hello world')
      })

      expect(spy).toHaveBeenCalledTimes(2)
      expect(screen.getAllByLabelText(sharedPeerNameLabel)).toHaveLength(2)

      // Clearing the colliding peer triggers one recomputation and clears badges.
      rerender(<Harness peerList={[]} />)
      expect(spy).toHaveBeenCalledTimes(3)
      expect(screen.queryByLabelText(sharedPeerNameLabel)).toBeNull()
    } finally {
      chatRoom.leave()
      spy.mockRestore()
    }
  })
})
