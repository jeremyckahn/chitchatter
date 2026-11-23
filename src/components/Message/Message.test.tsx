import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'
import { funAnimalName } from 'fun-animal-names'
import { useContext } from 'react'

import { createPlatformAdapters } from 'core/adapters/noop'
import { ChatRoom } from 'core/chat/ChatRoom'
import { deriveUserIdFromKey } from 'core/chat/identity'
import { createPeer } from 'core/chat/peers'
import { encryption, EncryptionService } from 'core/crypto/Encryption'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import { getPeerFingerprint, getPeerName } from 'core/names/peerNames'
import { findCollidingUserIds } from 'test-utils/peerNames'
import {
  peerFingerprintLabel,
  sharedPeerNameLabel,
  SharedPeerNamesProvider,
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
        <SettingsContext.Provider value={userSettingsStub}>
          <ShellContext.Provider value={{ ...shellDefaults, peerList }}>
            <SharedPeerNamesProvider>
              <Message
                message={{
                  ...mockReceivedMessage,
                  authorId: authorUserId,
                  authorVerificationState: PeerVerificationState.VERIFIED,
                }}
                userId={mockUserId}
                showAuthor={true}
              />
            </SharedPeerNamesProvider>
          </ShellContext.Provider>
        </SettingsContext.Provider>
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
      ['a remote author with no verification verdict', {}],
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

    const createLiveRoom = async ({
      network,
      peerId,
      customUsername = '',
      encryptionService = encryption,
    }: {
      network: ReturnType<typeof createInMemoryNetwork>
      peerId: string
      customUsername?: string
      encryptionService?: EncryptionService
    }) => {
      const keyPair = await encryption.generateKeyPair()
      const userId = await deriveUserIdFromKey(encryption, keyPair.publicKey)
      let nextId = 0
      const transport = new InMemoryTransport(network, peerId)
      const room = new ChatRoom({
        roomId: 'room-667',
        userId,
        customUsername,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        transport,
        encryptionService,
        adapters: createPlatformAdapters({
          uuid: () => `${peerId}-msg-${++nextId}`,
        }),
      })

      let hasLeft = false

      const leave = async () => {
        if (hasLeft) return
        hasLeft = true
        await room.leave()
        transport.leaveRoom()
      }

      return { room, userId, leave }
    }

    const LiveRoomMessages = ({
      chatRoom,
      selfUserId,
    }: {
      chatRoom: ChatRoom
      selfUserId: string
    }) => {
      const shellDefaults = useContext(ShellContext)
      const settingsStub = userSettingsContextStubFactory({
        userId: selfUserId,
      })

      return (
        <SettingsContext.Provider value={settingsStub}>
          <ShellContext.Provider
            value={{
              ...shellDefaults,
              chatRoom,
              peerList: chatRoom.getPeers(),
            }}
          >
            <SharedPeerNamesProvider>
              {chatRoom.getMessageLog().map(message => (
                <Message
                  key={message.id}
                  message={message}
                  userId={selfUserId}
                  showAuthor={true}
                />
              ))}
            </SharedPeerNamesProvider>
          </ShellContext.Provider>
        </SettingsContext.Provider>
      )
    }

    test('flags both old and new messages when a newcomer matches a departed proven author', async () => {
      // Regression (#667): Alice sends a verified message and leaves; an
      // impostor then joins with her generated name. Both messages must show
      // the shared-name badge via the real ChatRoom history subscription.
      const network = createInMemoryNetwork()
      const bob = await createLiveRoom({ network, peerId: 'bob-peer' })
      const alice = await createLiveRoom({ network, peerId: 'alice-peer' })

      try {
        bob.room.join()
        alice.room.join()

        await waitFor(() => {
          expect(bob.room.getPeers()).toEqual([
            expect.objectContaining({
              userId: alice.userId,
              verificationState: PeerVerificationState.VERIFIED,
            }),
          ])
        })

        await alice.room.sendMessage('hello from Alice')

        await waitFor(() => {
          expect(bob.room.getMessageLog()).toHaveLength(1)
        })

        await alice.leave()

        await waitFor(() => {
          expect(bob.room.getPeers()).toHaveLength(0)
        })

        const impostor = await createLiveRoom({
          network,
          peerId: 'impostor-peer',
          customUsername: getPeerName(alice.userId),
        })

        try {
          impostor.room.join()

          await waitFor(() => {
            expect(bob.room.getPeers()).toEqual([
              expect.objectContaining({
                userId: impostor.userId,
                verificationState: PeerVerificationState.VERIFIED,
              }),
            ])
          })

          await impostor.room.sendMessage('hello from impostor')

          await waitFor(() => {
            expect(bob.room.getMessageLog()).toHaveLength(2)
          })

          const { rerender } = render(
            <LiveRoomMessages chatRoom={bob.room} selfUserId={bob.userId} />
          )

          expect(screen.getAllByLabelText(sharedPeerNameLabel)).toHaveLength(2)

          // Switching to a room without the departed author clears the badge.
          const otherNetwork = createInMemoryNetwork()
          const otherRoom = await createLiveRoom({
            network: otherNetwork,
            peerId: 'bob-other',
          })
          const otherImpostor = await createLiveRoom({
            network: otherNetwork,
            peerId: 'impostor-other',
            customUsername: getPeerName(alice.userId),
          })

          try {
            otherRoom.room.join()
            otherImpostor.room.join()

            await waitFor(() => {
              expect(otherRoom.room.getPeers()).toHaveLength(1)
            })

            await otherImpostor.room.sendMessage('fresh room message')

            await waitFor(() => {
              expect(otherRoom.room.getMessageLog()).toHaveLength(1)
            })

            act(() => {
              rerender(
                <LiveRoomMessages
                  chatRoom={otherRoom.room}
                  selfUserId={otherRoom.userId}
                />
              )
            })

            expect(screen.queryByLabelText(sharedPeerNameLabel)).toBeNull()
          } finally {
            await otherImpostor.leave()
            await otherRoom.leave()
          }
        } finally {
          await impostor.leave()
        }
      } finally {
        await alice.leave()
        await bob.leave()
      }
    })

    test('does not flag messages when the departed history entry was relayed', async () => {
      const network = createInMemoryNetwork()
      const host = await createLiveRoom({ network, peerId: 'host-peer' })
      const alice = await createLiveRoom({ network, peerId: 'alice-peer' })

      try {
        host.room.join()
        alice.room.join()

        await waitFor(() => {
          expect(host.room.getPeers()).toEqual([
            expect.objectContaining({
              userId: alice.userId,
              verificationState: PeerVerificationState.VERIFIED,
            }),
          ])
        })

        await alice.room.sendMessage('earlier message')

        await waitFor(() => {
          expect(host.room.getMessageLog()).toHaveLength(1)
        })

        await alice.leave()

        await waitFor(() => {
          expect(host.room.getPeers()).toHaveLength(0)
        })

        // Late joiner receives Alice's old message only as relayed backfill.
        const lateJoiner = await createLiveRoom({
          network,
          peerId: 'late-peer',
        })
        const impostor = await createLiveRoom({
          network,
          peerId: 'impostor-peer',
          customUsername: getPeerName(alice.userId),
        })

        try {
          lateJoiner.room.join()

          await waitFor(() => {
            expect(lateJoiner.room.getMessageLog()).toEqual([
              expect.objectContaining({
                authorId: alice.userId,
                isRelayed: true,
              }),
            ])
          })

          impostor.room.join()

          await waitFor(() => {
            expect(lateJoiner.room.getPeers()).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  userId: impostor.userId,
                  verificationState: PeerVerificationState.VERIFIED,
                }),
              ])
            )
          })

          await impostor.room.sendMessage('live message')

          await waitFor(() => {
            expect(lateJoiner.room.getMessageLog()).toHaveLength(2)
          })

          render(
            <LiveRoomMessages
              chatRoom={lateJoiner.room}
              selfUserId={lateJoiner.userId}
            />
          )

          expect(screen.queryByLabelText(sharedPeerNameLabel)).toBeNull()
        } finally {
          await impostor.leave()
          await lateJoiner.leave()
        }
      } finally {
        await alice.leave()
        await host.leave()
      }
    })

    test('does not flag messages when the departed history entry was unverified', async () => {
      const rejectingEncryption = new EncryptionService()

      vi.spyOn(rejectingEncryption, 'verifySignature').mockResolvedValue(false)

      const network = createInMemoryNetwork()
      const bob = await createLiveRoom({
        network,
        peerId: 'bob-peer',
        encryptionService: rejectingEncryption,
      })
      const unverified = await createLiveRoom({
        network,
        peerId: 'unverified-peer',
      })

      try {
        bob.room.join()
        unverified.room.join()

        await waitFor(() => {
          expect(bob.room.getPeers()).toEqual([
            expect.objectContaining({
              userId: unverified.userId,
              verificationState: PeerVerificationState.UNVERIFIED,
            }),
          ])
        })

        await unverified.room.sendMessage('unverified message')

        await waitFor(() => {
          expect(bob.room.getMessageLog()).toEqual([
            expect.objectContaining({
              authorId: unverified.userId,
              authorVerificationState: PeerVerificationState.UNVERIFIED,
            }),
          ])
        })

        await unverified.leave()

        await waitFor(() => {
          expect(bob.room.getPeers()).toHaveLength(0)
        })

        const newcomer = await createLiveRoom({
          network,
          peerId: 'newcomer-peer',
          customUsername: getPeerName(unverified.userId),
        })

        try {
          newcomer.room.join()

          await waitFor(() => {
            expect(bob.room.getPeers()).toHaveLength(1)
          })

          await newcomer.room.sendMessage('newcomer message')

          await waitFor(() => {
            expect(bob.room.getMessageLog()).toHaveLength(2)
          })

          render(
            <LiveRoomMessages chatRoom={bob.room} selfUserId={bob.userId} />
          )

          expect(screen.queryByLabelText(sharedPeerNameLabel)).toBeNull()
        } finally {
          await newcomer.leave()
        }
      } finally {
        await unverified.leave()
        await bob.leave()
      }
    })
  })
})
