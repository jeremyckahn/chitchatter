import { render, screen } from '@testing-library/react'
import { funAnimalName } from 'fun-animal-names'

import { SettingsContext } from 'contexts/SettingsContext'
import { PeerVerificationState, ReceivedMessage } from 'core/models/chat'
import { unverifiedAuthorLabel } from 'components/Message/AuthorVerificationBadge'
import { userSettingsContextStubFactory } from 'test-utils/stubs/settingsContext'

import { ChatTranscript } from './ChatTranscript'

const selfUserId = 'self-user'
const peerUserId = 'peer-user'

const received = (
  id: string,
  authorVerificationState?: PeerVerificationState
): ReceivedMessage => ({
  id,
  text: `text of ${id}`,
  timeSent: 1,
  timeReceived: 2,
  authorId: peerUserId,
  authorVerificationState,
})

const renderTranscript = (messageLog: ReceivedMessage[]) =>
  render(
    <SettingsContext.Provider
      value={userSettingsContextStubFactory({ userId: selfUserId })}
    >
      <ChatTranscript messageLog={messageLog} userId={selfUserId} />
    </SettingsContext.Provider>
  )

describe('ChatTranscript', () => {
  test('shows one author line for a run of messages by the same sender', () => {
    renderTranscript([
      received('a', PeerVerificationState.VERIFIED),
      received('b', PeerVerificationState.VERIFIED),
    ])

    expect(screen.getAllByText(funAnimalName(peerUserId))).toHaveLength(1)
  })

  test('starts a new run when an unverified sender writes under the same id, and flags each of its messages', () => {
    renderTranscript([
      received('a', PeerVerificationState.VERIFIED),
      received('b', PeerVerificationState.UNVERIFIED),
      received('c', PeerVerificationState.UNVERIFIED),
      received('d', PeerVerificationState.VERIFIED),
    ])

    expect(screen.getAllByText(funAnimalName(peerUserId))).toHaveLength(4)
    expect(screen.getAllByLabelText(unverifiedAuthorLabel)).toHaveLength(2)
  })
})
