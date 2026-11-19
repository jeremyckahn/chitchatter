import { render, screen } from '@testing-library/react'
import { PropsWithChildren, useContext } from 'react'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { createPeer } from 'core/chat/peers'
import { encryption } from 'core/crypto/Encryption'
import { Peer, PeerVerificationState } from 'core/models/chat'
import { findCollidingUserIds } from 'test-utils/peerNames'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { PeerFingerprint, peerFingerprintLabel } from './PeerFingerprint'
import { SharedPeerNameBadge, sharedPeerNameLabel } from './SharedPeerNameBadge'

const selfUserId = 'a'.repeat(64)
const [collidingUserId1, collidingUserId2] = findCollidingUserIds()

const createTestPeer = (userId: string): Peer =>
  createPeer({
    peerId: `peer-${userId}`,
    userId,
    customUsername: '',
    publicKey: encryption.cryptoKeyStub,
    verificationState: PeerVerificationState.VERIFIED,
  })

const createWrapper = (peerList: readonly Peer[], userId = selfUserId) => {
  const userSettingsStub = userSettingsContextStubFactory({ userId })

  const Wrapper = ({ children }: PropsWithChildren) => {
    const shellDefaults = useContext(ShellContext)

    return (
      <SettingsContext.Provider value={userSettingsStub}>
        <ShellContext.Provider value={{ ...shellDefaults, peerList }}>
          {children}
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
})
