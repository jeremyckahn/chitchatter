import { render, screen } from '@testing-library/react'
import { funAnimalName } from 'fun-animal-names'

import { ReceivedMessage, UnsentMessage } from 'models/chat'

import { Message } from './Message'

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

describe('Message', () => {
  test('renders unsent message text', () => {
    render(
      <Message
        message={mockUnsentMessage}
        userId={mockUserId}
        showAuthor={false}
      />
    )

    screen.getByText(mockUnsentMessage.text)
  })

  test('renders received message text', () => {
    render(
      <Message
        message={mockReceivedMessage}
        userId={mockUserId}
        showAuthor={false}
      />
    )

    screen.getByText(mockReceivedMessage.text)
  })

  test('renders message author', () => {
    render(
      <Message
        message={mockReceivedMessage}
        userId={mockUserId}
        showAuthor={true}
      />
    )

    screen.getByText(funAnimalName(mockUserId))
  })
})
