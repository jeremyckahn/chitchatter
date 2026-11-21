import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { funAnimalName } from 'fun-animal-names'
import { useContext } from 'react'

import { createPeer } from 'core/chat/peers'
import { encryption } from 'core/crypto/Encryption'
import { getPeerFingerprint, getPeerName } from 'core/names/peerNames'
import { findCollidingUserIds } from 'test-utils/peerNames'
import {
  peerFingerprintLabel,
  sharedPeerNameLabel,
} from 'components/PeerNameDisplay'

import {
  Peer,
  PeerVerificationState,
  ReceivedMessage,
  UnsentMessage,
} from 'core/models/chat'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { Message, MessageProps } from './Message'
import {
  relayedMessageLabel,
  unverifiedAuthorLabel,
  verifyingAuthorLabel,
} from './AuthorVerificationBadge'

const mockUserId = 'user-123'

const mockUnsentMessage: UnsentMessage = {
  id: 'abc123',
  text: 'unsent message',
  timeSent: 1,
  authorId: mockUserId,
}

const mockReceivedMessage: ReceivedMessage = {
  id: 'abc123',
  text: 'received message',
  timeSent: 1,
  authorId: mockUserId,
  timeReceived: 2,
}

const userSettingsStub = userSettingsContextStubFactory({
  userId: mockUserId,
})

const MockMessage = (props: MessageProps) => (
  <SettingsContext.Provider value={userSettingsStub}>
    <Message {...props} />
  </SettingsContext.Provider>
)

describe('Message', () => {
  test('renders unsent message text', () => {
    render(
      <MockMessage
        message={mockUnsentMessage}
        userId={mockUserId}
        showAuthor={false}
      />
    )

    screen.getByText(mockUnsentMessage.text)
  })

  test('renders received message text', () => {
    render(
      <MockMessage
        message={mockReceivedMessage}
        userId={mockUserId}
        showAuthor={false}
      />
    )

    screen.getByText(mockReceivedMessage.text)
  })

  test('renders message author', () => {
    render(
      <MockMessage
        message={mockReceivedMessage}
        userId={mockUserId}
        showAuthor={true}
      />
    )

    screen.getByText(funAnimalName(mockUserId))
  })

  describe('author verification', () => {
    const peerUserId = 'peer-456'

    const fromPeer = (
      authorVerificationState?: PeerVerificationState
    ): ReceivedMessage => ({
      ...mockReceivedMessage,
      authorId: peerUserId,
      authorVerificationState,
    })

    const renderFromPeer = (authorVerificationState?: PeerVerificationState) =>
      render(
        <MockMessage
          message={fromPeer(authorVerificationState)}
          userId={mockUserId}
          showAuthor={true}
        />
      )

    test('flags a message from an unverified sender', () => {
      renderFromPeer(PeerVerificationState.UNVERIFIED)

      expect(screen.getByLabelText(unverifiedAuthorLabel)).toBeInTheDocument()
    })

    test('shows that the sender is still being verified', () => {
      renderFromPeer(PeerVerificationState.VERIFYING)

      expect(screen.getByLabelText(verifyingAuthorLabel)).toBeInTheDocument()
      expect(screen.queryByLabelText(unverifiedAuthorLabel)).toBeNull()
    })

    test.each<[string, PeerVerificationState | undefined]>([
      ['a verified sender', PeerVerificationState.VERIFIED],
      ['a message with no verdict', undefined],
    ])('does not flag %s', (_, state) => {
      renderFromPeer(state)

      expect(screen.queryByLabelText(unverifiedAuthorLabel)).toBeNull()
      expect(screen.queryByLabelText(verifyingAuthorLabel)).toBeNull()
      expect(screen.queryByLabelText(relayedMessageLabel)).toBeNull()
    })

    test('flags a message relayed in a transcript backfill', () => {
      render(
        <MockMessage
          message={{
            ...mockReceivedMessage,
            authorId: peerUserId,
            isRelayed: true,
          }}
          userId={mockUserId}
          showAuthor={true}
        />
      )

      expect(screen.getByLabelText(relayedMessageLabel)).toBeInTheDocument()
    })

    test('flags a relayed message that names this user as its author', () => {
      // A backfill can name anyone as author, this client's own user included,
      // and it must not pass for something this user sent.
      render(
        <MockMessage
          message={{ ...mockReceivedMessage, isRelayed: true }}
          userId={mockUserId}
          showAuthor={true}
        />
      )

      expect(screen.getByLabelText(relayedMessageLabel)).toBeInTheDocument()
    })
  })

  describe('author name', () => {
    const [authorUserId, impostorUserId] = findCollidingUserIds()

    const authorPeer = createPeer({
      peerId: 'author-peer',
      userId: authorUserId,
      customUsername: '',
      publicKey: encryption.cryptoKeyStub,
      verificationState: PeerVerificationState.VERIFIED,
    })

    const MessageInRoom = ({ peerList }: { peerList: readonly Peer[] }) => {
      const shellDefaults = useContext(ShellContext)

      return (
        <ShellContext.Provider value={{ ...shellDefaults, peerList }}>
          <MockMessage
            message={{ ...mockReceivedMessage, authorId: authorUserId }}
            userId={mockUserId}
            showAuthor={true}
          />
        </ShellContext.Provider>
      )
    }

    test('flags an author whose generated name another peer shares', () => {
      // Regression: a verified peer could take another user's generated name
      // by trying keys until one matched, and nothing in the UI showed it.
      render(
        <MessageInRoom
          peerList={[
            authorPeer,
            { ...authorPeer, peerId: 'impostor-peer', userId: impostorUserId },
          ]}
        />
      )

      expect(getPeerName(authorUserId)).toBe(getPeerName(impostorUserId))
      expect(screen.getByLabelText(sharedPeerNameLabel)).toBeInTheDocument()
    })

    test('does not flag an author whose generated name is unique', () => {
      render(<MessageInRoom peerList={[authorPeer]} />)

      expect(screen.queryByLabelText(sharedPeerNameLabel)).toBeNull()
    })

    test("offers the author's fingerprint", () => {
      render(<MessageInRoom peerList={[authorPeer]} />)

      expect(
        screen.getByLabelText(new RegExp(`^${peerFingerprintLabel}: `))
      ).toBeInTheDocument()
    })

    test.each<
      [
        string,
        Partial<Pick<ReceivedMessage, 'authorVerificationState' | 'isRelayed'>>,
      ]
    >([
      [
        'an unverified author',
        { authorVerificationState: PeerVerificationState.UNVERIFIED },
      ],
      [
        'an author still being verified',
        { authorVerificationState: PeerVerificationState.VERIFYING },
      ],
      ['the author a relayed message names', { isRelayed: true }],
    ])('does not offer the fingerprint of %s', (_, overrides) => {
      // Regression: anyone can claim a user id, so showing its fingerprint for
      // a sender that has not proven the key lent an impostor its weight.
      render(
        <MockMessage
          message={{
            ...mockReceivedMessage,
            authorId: authorUserId,
            ...overrides,
          }}
          userId={mockUserId}
          showAuthor={true}
        />
      )

      expect(
        screen.queryByLabelText(new RegExp(`^${peerFingerprintLabel}: `))
      ).toBeNull()
    })

    test("shows the author's fingerprint on hovering their name", async () => {
      // Regression: the tooltip's child did not take a ref, so the tooltip
      // never opened, though its label was set.
      render(<MessageInRoom peerList={[authorPeer]} />)

      await userEvent.hover(screen.getByText(getPeerName(authorUserId)))

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        `${peerFingerprintLabel}: ${getPeerFingerprint(authorUserId)}`
      )
    })
  })
})
