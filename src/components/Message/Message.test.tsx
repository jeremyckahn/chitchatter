import { render, screen } from '@testing-library/react'
import { SettingsContext } from 'contexts/SettingsContext'
import { funAnimalName } from 'fun-animal-names'

import {
  PeerVerificationState,
  ReceivedMessage,
  UnsentMessage,
} from 'core/models/chat'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { Message, MessageProps } from './Message'
import {
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
    })
  })
})
