import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createPlatformAdapters } from 'core/adapters/noop'
import {
  FileTransferAdapter,
  IdAdapter,
  PlatformAdapters,
} from 'core/adapters/types'
import { ChatRoom } from 'core/chat/ChatRoom'
import { ChatRoomEvent } from 'core/chat/events'
import { encryption } from 'core/crypto/Encryption'
import { PeerAction } from 'core/models/network'
import {
  isMessageReceived,
  PeerVerificationState,
  ReceivedMessage,
} from 'core/models/chat'
import { getPeerName } from 'core/names/peerNames'
import {
  createInMemoryNetwork,
  InMemoryTransport,
} from 'core/transport/InMemoryTransport'
import { ActionNamespace, PeerHookType } from 'core/transport/types'

/**
 * These tests run two or three real ChatRooms against each other over
 * InMemoryTransport, in a Node environment with no DOM. That the whole file
 * works at all is the proof the core is headless.
 */

let keyPairs: CryptoKeyPair[]

beforeAll(async () => {
  // Key generation is the slow part, so generate once and share.
  keyPairs = await Promise.all([
    encryption.generateKeyPair(),
    encryption.generateKeyPair(),
    encryption.generateKeyPair(),
  ])
}, 30_000)

const makeIds = (): IdAdapter => {
  let n = 0

  return { uuid: () => `id-${++n}` }
}

const roomId = 'test-room'

interface Client {
  chatRoom: ChatRoom
  transport: InMemoryTransport
  adapters: PlatformAdapters
  fileTransfer: FileTransferAdapter
}

const createClient = (
  network: ReturnType<typeof createInMemoryNetwork>,
  index: number,
  {
    password,
    customUsername = '',
    targetPeerId,
  }: {
    password?: string
    customUsername?: string
    targetPeerId?: string
  } = {}
): Client => {
  const peerId = `peer-${index}`
  const transport = new InMemoryTransport(network, peerId)
  const fileTransfer: FileTransferAdapter = {
    offer: vi.fn(async () => `magnet:${peerId}`),
    rescind: vi.fn(async () => {}),
    rescindAll: vi.fn(async () => {}),
    isOffering: vi.fn(() => true),
  }
  const adapters = createPlatformAdapters(makeIds(), {
    fileTransfer,
    logger: { warn: vi.fn(), error: vi.fn() },
  })

  const chatRoom = new ChatRoom({
    roomId,
    userId: `user-${index}`,
    customUsername,
    publicKey: keyPairs[index].publicKey,
    privateKey: keyPairs[index].privateKey,
    transport,
    adapters,
    password,
    targetPeerId,
  })

  return { chatRoom, transport, adapters, fileTransfer }
}

/**
 * A direct-message room riding an existing client's transport, scoped to one
 * peer — the shape the web app builds when a peer's dialog is opened.
 */
const createDirectMessageRoom = (
  client: Client,
  index: number,
  targetPeerId: string
) =>
  new ChatRoom({
    roomId,
    userId: `user-${index}`,
    customUsername: '',
    publicKey: keyPairs[index].publicKey,
    privateKey: keyPairs[index].privateKey,
    transport: client.transport,
    adapters: client.adapters,
    targetPeerId,
  })

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Waits for a condition rather than for a fixed number of turns.
 *
 * Peer verification does real WebCrypto work, so how many event-loop turns a
 * round trip takes is not fixed. Polling a predicate keeps these tests
 * deterministic in outcome instead of racing the crypto.
 */
const waitFor = async (
  predicate: () => boolean,
  label: string,
  timeoutMs = 8_000
) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (predicate()) return

    await tick()
  }

  throw new Error(`Timed out waiting for: ${label}`)
}

/** Lets in-flight protocol traffic drain when there is no condition to await. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await tick()
}

/** Joins every client and waits until each one has seen all the others. */
const joinAll = async (...clients: Client[]) => {
  for (const { chatRoom } of clients) await chatRoom.join()

  await waitFor(
    () =>
      clients.every(
        ({ chatRoom }) => chatRoom.getPeers().length === clients.length - 1
      ),
    `all ${clients.length} clients to see each other`
  )
}

describe('ChatRoom', () => {
  let network: ReturnType<typeof createInMemoryNetwork>

  beforeEach(() => {
    network = createInMemoryNetwork()
  })

  describe('messaging between two clients', () => {
    it('delivers a message to the other peer with a receipt time', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      await alice.chatRoom.sendMessage('hello bob')
      await settle()

      const received = bob.chatRoom.getMessageLog()

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({
        text: 'hello bob',
        authorId: 'user-0',
      })
      expect(isMessageReceived(received[0])).toBe(true)
    })

    it('emits MESSAGE_RECEIVED exactly once, alongside MESSAGE_LOG_CHANGE', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const onReceived = vi.fn()
      const onLogChange = vi.fn()

      bob.chatRoom.on(ChatRoomEvent.MESSAGE_RECEIVED, onReceived)
      bob.chatRoom.on(ChatRoomEvent.MESSAGE_LOG_CHANGE, onLogChange)

      await alice.chatRoom.sendMessage('hello')
      await settle()

      expect(onReceived).toHaveBeenCalledTimes(1)
      expect(onReceived.mock.calls[0][0].peerId).toBe('peer-0')
      expect(onLogChange).toHaveBeenCalled()
    })

    it("records the sender's own message optimistically, then marks it delivered", async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()

      const logStates: boolean[] = []

      alice.chatRoom.on(ChatRoomEvent.MESSAGE_LOG_CHANGE, ({ messageLog }) => {
        logStates.push(messageLog.every(isMessageReceived))
      })

      await alice.chatRoom.sendMessage('hi')

      // First the unsent message, then the same message stamped as delivered.
      expect(logStates).toEqual([false, true])
      expect(alice.chatRoom.getMessageLog()).toHaveLength(1)
    })

    it('does not echo a message back to its sender', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      await alice.chatRoom.sendMessage('hello')
      await settle()

      expect(alice.chatRoom.getMessageLog()).toHaveLength(1)
    })

    it('reports its sending state around a send', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()

      const states: boolean[] = []

      alice.chatRoom.on(
        ChatRoomEvent.SENDING_STATE_CHANGE,
        ({ isMessageSending }) => states.push(isMessageSending)
      )

      await alice.chatRoom.sendMessage('hi')

      expect(states).toEqual([true, false])
      expect(alice.chatRoom.getIsMessageSending()).toBe(false)
    })
  })

  describe('peer identity', () => {
    it('populates both peer lists with verified peers', async () => {
      const alice = createClient(network, 0, { customUsername: 'Ada' })
      const bob = createClient(network, 1, { customUsername: 'Bob' })

      await joinAll(alice, bob)

      const [bobAsSeenByAlice] = alice.chatRoom.getPeers()
      const [aliceAsSeenByBob] = bob.chatRoom.getPeers()

      expect(bobAsSeenByAlice).toMatchObject({
        peerId: 'peer-1',
        userId: 'user-1',
        customUsername: 'Bob',
        verificationState: PeerVerificationState.VERIFIED,
      })
      expect(aliceAsSeenByBob).toMatchObject({
        peerId: 'peer-0',
        userId: 'user-0',
        customUsername: 'Ada',
        verificationState: PeerVerificationState.VERIFIED,
      })
    })

    it('marks a peer UNVERIFIED when its signature does not match its key', async () => {
      const alice = createClient(network, 0)
      const impostorTransport = new InMemoryTransport(network, 'peer-9')

      await alice.chatRoom.join()

      const verifications: PeerVerificationState[] = []

      alice.chatRoom.on(
        ChatRoomEvent.PEER_VERIFICATION,
        ({ verificationState }) => verifications.push(verificationState)
      )

      // Advertise key 1 but sign with key 2.
      const { signIdentity } = await import('core/chat/identity')
      const forged = await signIdentity({
        encryptionService: encryption,
        publicKey: keyPairs[2].publicKey,
        privateKey: keyPairs[2].privateKey,
        roomId,
        userId: 'user-9',
      })

      const [sendMetadata] = impostorTransport.makeAction<any>(
        PeerAction.PEER_METADATA,
        ActionNamespace.GROUP
      )

      await sendMetadata({
        userId: 'user-9',
        customUsername: 'Impostor',
        publicKeyString: await encryption.stringifyCryptoKey(
          keyPairs[1].publicKey
        ),
        identitySignatureBase64: forged.identitySignatureBase64,
      })
      await settle()

      expect(verifications).toContain(PeerVerificationState.UNVERIFIED)
      expect(alice.chatRoom.getPeers()[0].verificationState).toBe(
        PeerVerificationState.UNVERIFIED
      )
      // The warning is a documented diagnostic; an e2e test asserts on it.
      expect(alice.adapters.logger.warn).toHaveBeenCalledWith(
        'Peer verification failed, marking peer as unverified'
      )
    })

    it('announces a rename with display names the host can show verbatim', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1, { customUsername: 'Bob' })

      await joinAll(alice, bob)

      const onRename = vi.fn()

      alice.chatRoom.on(ChatRoomEvent.PEER_RENAME, onRename)

      await bob.chatRoom.setCustomUsername('Roberta')
      await settle()

      expect(onRename).toHaveBeenCalledTimes(1)
      expect(onRename.mock.calls[0][0]).toEqual({
        peerId: 'peer-1',
        previousDisplayName: `Bob (${getPeerName('user-1')})`,
        displayName: `Roberta (${getPeerName('user-1')})`,
      })
    })

    it('removes a peer and reports it on leave', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      expect(alice.chatRoom.getPeers()).toHaveLength(1)

      const onLeave = vi.fn()

      alice.chatRoom.on(ChatRoomEvent.PEER_LEAVE, onLeave)

      bob.transport.leaveRoom()
      await settle()

      expect(alice.chatRoom.getPeers()).toHaveLength(0)
      expect(onLeave.mock.calls[0][0].peerId).toBe('peer-1')
      expect(onLeave.mock.calls[0][0].peer?.userId).toBe('user-1')
    })
  })

  describe('typing status', () => {
    it('announces typing immediately and expires it after the idle interval', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const statuses: boolean[] = []

      bob.chatRoom.on(ChatRoomEvent.TYPING_STATUS_CHANGE, ({ isTyping }) =>
        statuses.push(isTyping)
      )

      alice.chatRoom.notifyTyping()

      await waitFor(() => statuses.length === 1, 'the typing announcement')

      expect(statuses).toEqual([true])
      expect(alice.chatRoom.getSelf().isTyping).toBe(true)

      await waitFor(() => statuses.length === 2, 'the typing status to expire')

      expect(statuses).toEqual([true, false])
      expect(alice.chatRoom.getSelf().isTyping).toBe(false)
    }, 10_000)

    it('does not re-announce typing on every keystroke', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const statuses: boolean[] = []

      bob.chatRoom.on(ChatRoomEvent.TYPING_STATUS_CHANGE, ({ isTyping }) =>
        statuses.push(isTyping)
      )

      alice.chatRoom.notifyTyping()
      await waitFor(() => statuses.length === 1, 'the typing announcement')

      alice.chatRoom.notifyTyping()
      alice.chatRoom.notifyTyping()
      await settle()

      expect(statuses).toEqual([true])

      // Each keystroke pushed the expiry back rather than re-announcing.
      await waitFor(() => statuses.length === 2, 'the typing status to expire')

      expect(statuses).toEqual([true, false])
    }, 10_000)

    it('clears a peer typing flag when their message arrives', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      alice.chatRoom.notifyTyping()

      await waitFor(
        () => bob.chatRoom.getPeers()[0].isTypingGroupMessage,
        'bob to see alice typing'
      )

      await alice.chatRoom.sendMessage('done typing')

      await waitFor(
        () => !bob.chatRoom.getPeers()[0].isTypingGroupMessage,
        'the typing flag to clear'
      )
    })
  })

  describe('transcript backfill', () => {
    it('hands history to a peer joining a public room', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      await alice.chatRoom.sendMessage('said before carol arrived')
      await settle()

      const carol = createClient(network, 2)

      await carol.chatRoom.join()
      await settle()

      expect(carol.chatRoom.getMessageLog()).toHaveLength(1)
      expect(carol.chatRoom.getMessageLog()[0]).toMatchObject({
        text: 'said before carol arrived',
      })
    })

    it('withholds history in a private room', async () => {
      const password = 'hunter2'
      const alice = createClient(network, 0, { password })
      const bob = createClient(network, 1, { password })

      await joinAll(alice, bob)

      await alice.chatRoom.sendMessage('secret')
      await settle()

      const carol = createClient(network, 2, { password })

      await carol.chatRoom.join()
      await settle()

      expect(carol.chatRoom.getMessageLog()).toHaveLength(0)
      expect(carol.chatRoom.isPrivate).toBe(true)
    })

    it('does not overwrite a log the joiner already has', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()
      await alice.chatRoom.sendMessage('mine')

      const transcript: ReceivedMessage[] = [
        {
          id: 'other',
          text: 'theirs',
          timeSent: 0,
          timeReceived: 0,
          authorId: 'user-9',
        },
      ]
      const impostor = new InMemoryTransport(network, 'peer-9')
      const [sendTranscript] = impostor.makeAction<any>(
        PeerAction.MESSAGE_TRANSCRIPT,
        ActionNamespace.GROUP
      )

      await sendTranscript(transcript)
      await settle()

      expect(alice.chatRoom.getMessageLog()).toHaveLength(1)
      expect(alice.chatRoom.getMessageLog()[0]).toMatchObject({ text: 'mine' })
    })
  })

  describe('joining after the transport has already connected', () => {
    /**
     * The regression that broke PR #616. TrysteroTransport joins the room in
     * its constructor — which useRoom calls during render — while ChatRoom
     * registers its peer-join handler later, in join(). A peer that connects in
     * between must still be announced, or it gets no metadata exchange and the
     * newcomer gets no transcript backfill.
     */
    it('still exchanges metadata when peers connected before join()', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      // Force the transports to connect while neither ChatRoom is listening.
      alice.transport.onPeerJoin(PeerHookType.AUDIO, () => {})
      bob.transport.onPeerJoin(PeerHookType.AUDIO, () => {})

      expect(alice.transport.getPeers()).toEqual(['peer-1'])

      await joinAll(alice, bob)

      expect(alice.chatRoom.getPeers()).toHaveLength(1)
      expect(bob.chatRoom.getPeers()).toHaveLength(1)
      expect(alice.chatRoom.getPeers()[0].verificationState).toBe(
        PeerVerificationState.VERIFIED
      )
    })

    it('still backfills the transcript to a peer that connected before join()', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()
      await alice.chatRoom.sendMessage('said before anyone could hear it')

      const bob = createClient(network, 1)

      // Bob's transport connects before his ChatRoom starts listening.
      bob.transport.onPeerJoin(PeerHookType.AUDIO, () => {})

      await bob.chatRoom.join()
      await waitFor(
        () => bob.chatRoom.getMessageLog().length === 1,
        'the backfilled transcript'
      )

      expect(bob.chatRoom.getMessageLog()[0]).toMatchObject({
        text: 'said before anyone could hear it',
      })
    })
  })

  describe('backfill of a message sent with no peers present', () => {
    /**
     * What room.test.ts:136 depends on: it sends a message without waiting for
     * a peer connection, so the only way that message reaches the other
     * browser is the transcript a joining peer is handed.
     */
    it('delivers a message sent before anyone joined, via backfill', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()

      expect(alice.chatRoom.getPeers()).toHaveLength(0)

      await alice.chatRoom.sendMessage('hello, nobody')

      const bob = createClient(network, 1)

      await bob.chatRoom.join()
      await waitFor(
        () => bob.chatRoom.getMessageLog().length === 1,
        'bob to receive the backfilled message'
      )

      expect(bob.chatRoom.getMessageLog()[0]).toMatchObject({
        text: 'hello, nobody',
        authorId: 'user-0',
      })
    })

    it('marks an own message delivered so it is eligible for backfill', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()
      await alice.chatRoom.sendMessage('no peers yet')

      // Only messages carrying timeReceived are backfilled, so a send with no
      // peers present must still stamp its own message.
      expect(alice.chatRoom.getMessageLog().every(isMessageReceived)).toBe(true)
    })
  })

  describe('transcript limit', () => {
    it('caps the log and rescinds offers for evicted inline media', async () => {
      const network2 = createInMemoryNetwork()
      const transport = new InMemoryTransport(network2, 'peer-0')
      const fileTransfer: FileTransferAdapter = {
        offer: vi.fn(async () => 'magnet:evicted'),
        rescind: vi.fn(async () => {}),
        rescindAll: vi.fn(async () => {}),
        isOffering: vi.fn(() => true),
      }

      const chatRoom = new ChatRoom({
        roomId,
        userId: 'user-0',
        customUsername: '',
        publicKey: keyPairs[0].publicKey,
        privateKey: keyPairs[0].privateKey,
        transport,
        adapters: createPlatformAdapters(makeIds(), { fileTransfer }),
        transcriptSizeLimit: 3,
      })

      await chatRoom.join()

      await chatRoom.sendInlineMedia([
        { name: 'a.png', type: 'image/png', size: 1 },
      ])
      for (const text of ['one', 'two', 'three']) {
        await chatRoom.sendMessage(text)
      }

      expect(chatRoom.getMessageLog()).toHaveLength(3)
      expect(chatRoom.getMessageLog().map((m: any) => m.text)).toEqual([
        'one',
        'two',
        'three',
      ])
      expect(fileTransfer.rescind).toHaveBeenCalledWith('magnet:evicted')
    })
  })

  describe('file offers', () => {
    it('propagates an offer to peers and records it against the offering peer', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const onOfferChange = vi.fn()

      bob.chatRoom.on(ChatRoomEvent.FILE_OFFER_CHANGE, onOfferChange)

      await alice.chatRoom.offerFiles([
        { name: 'doc.pdf', type: 'application/pdf', size: 10 },
      ])
      await settle()

      expect(onOfferChange).toHaveBeenCalledTimes(1)
      expect(bob.chatRoom.getFileOffers()['peer-0']).toEqual({
        magnetURI: 'magnet:peer-0',
        isAllInlineMedia: false,
      })
      expect(bob.chatRoom.getPeers()[0].offeredFileId).toBe('magnet:peer-0')
    })

    it('clears the offer on both sides when it is rescinded', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      await alice.chatRoom.offerFiles([
        { name: 'doc.pdf', type: 'application/pdf', size: 10 },
      ])
      await settle()

      await alice.chatRoom.rescindFileOffer()
      await settle()

      expect(bob.chatRoom.getFileOffers()).toEqual({})
      expect(bob.chatRoom.getPeers()[0].offeredFileId).toBeNull()
      expect(alice.fileTransfer.rescind).toHaveBeenCalledWith('magnet:peer-0')
    })

    it('spares an all-inline-media offer from being rescinded', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()

      await alice.chatRoom.offerFiles([
        { name: 'a.png', type: 'image/png', size: 1 },
      ])
      await alice.chatRoom.rescindFileOffer()

      expect(alice.fileTransfer.rescind).not.toHaveBeenCalled()
    })

    it('re-sends a standing offer to a peer that joins later', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()
      await alice.chatRoom.offerFiles([
        { name: 'doc.pdf', type: 'application/pdf', size: 10 },
      ])

      const bob = createClient(network, 1)

      await bob.chatRoom.join()
      await settle()

      expect(bob.chatRoom.getFileOffers()['peer-0']).toMatchObject({
        magnetURI: 'magnet:peer-0',
      })
    })

    it('drops a departing peer offer and rescinds it', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      await bob.chatRoom.offerFiles([
        { name: 'doc.pdf', type: 'application/pdf', size: 10 },
      ])
      await settle()

      bob.transport.leaveRoom()
      await settle()

      expect(alice.chatRoom.getFileOffers()).toEqual({})
      expect(alice.fileTransfer.rescind).toHaveBeenCalledWith('magnet:peer-1')
    })
  })

  describe('direct message rooms', () => {
    it('scopes sends to the target peer', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)
      const carol = createClient(network, 2)

      await joinAll(alice, bob, carol)

      // A DM room rides the same transport as the group room, under a separate
      // action namespace.
      const aliceToBob = createDirectMessageRoom(alice, 0, 'peer-1')
      const bobFromAlice = createDirectMessageRoom(bob, 1, 'peer-0')
      const carolDm = createDirectMessageRoom(carol, 2, 'peer-0')

      await aliceToBob.join()
      await bobFromAlice.join()
      await carolDm.join()
      await settle()

      await aliceToBob.sendMessage('just between us')
      await settle()

      expect(bobFromAlice.getMessageLog()).toHaveLength(1)
      expect(carolDm.getMessageLog()).toHaveLength(0)
      // The group transcript is untouched by the DM.
      expect(bob.chatRoom.getMessageLog()).toHaveLength(0)
      expect(aliceToBob.isDirectMessageRoom).toBe(true)
    })

    it('keeps one conversation out of another conversation on the same host', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)
      const carol = createClient(network, 2)

      await joinAll(alice, bob, carol)

      // Every peer dialog the host has opened keeps its room alive, and all of
      // them listen on the one `dm` namespace. Each has to recognise its own
      // correspondent or Bob's conversation leaks into Carol's.
      const aliceToBob = createDirectMessageRoom(alice, 0, 'peer-1')
      const aliceToCarol = createDirectMessageRoom(alice, 0, 'peer-2')
      const bobToAlice = createDirectMessageRoom(bob, 1, 'peer-0')

      await aliceToBob.join()
      await aliceToCarol.join()
      await bobToAlice.join()
      await settle()

      await bobToAlice.sendMessage('between you and me')
      bobToAlice.notifyTyping()
      await bobToAlice.offerFiles([
        { name: 'secret.pdf', type: 'application/pdf', size: 1 },
      ])
      await settle()

      expect(aliceToBob.getMessageLog()).toHaveLength(1)
      expect(aliceToBob.getPeers().map(({ peerId }) => peerId)).toEqual([
        'peer-1',
      ])
      expect(Object.keys(aliceToBob.getFileOffers())).toEqual(['peer-1'])

      expect(aliceToCarol.getMessageLog()).toHaveLength(0)
      expect(aliceToCarol.getPeers()).toHaveLength(0)
      expect(aliceToCarol.getFileOffers()).toEqual({})
    })

    it('does not hand its history to the peer on the other side', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const aliceToBob = createDirectMessageRoom(alice, 0, 'peer-1')

      await aliceToBob.join()
      await aliceToBob.sendMessage('said before you opened this')
      await settle()

      // Bob opens the conversation only now. A direct-message transcript is
      // not backfilled: it belongs to the two people in it, and sending it
      // would also publish it to every other DM room on the namespace.
      const bobToAlice = createDirectMessageRoom(bob, 1, 'peer-0')

      await bobToAlice.join()
      await settle()

      expect(bobToAlice.getMessageLog()).toHaveLength(0)
    })
  })

  describe('snapshots', () => {
    it('returns an identical reference until the data changes', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()

      const log = alice.chatRoom.getMessageLog()
      const peers = alice.chatRoom.getPeers()
      const self = alice.chatRoom.getSelf()

      expect(alice.chatRoom.getMessageLog()).toBe(log)
      expect(alice.chatRoom.getPeers()).toBe(peers)
      expect(alice.chatRoom.getSelf()).toBe(self)

      await alice.chatRoom.sendMessage('change it')

      expect(alice.chatRoom.getMessageLog()).not.toBe(log)
      // Peers did not change, so that snapshot is still stable.
      expect(alice.chatRoom.getPeers()).toBe(peers)
    })

    it('leaves the peers snapshot alone when updatePeer changes nothing', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const peers = alice.chatRoom.getPeers()

      alice.chatRoom.updatePeer('nobody-here', { customUsername: 'x' })

      expect(alice.chatRoom.getPeers()).toBe(peers)
    })

    it('leaves the peers snapshot alone when an update repeats what a peer already says', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const peers = alice.chatRoom.getPeers()
      const onPeerListChange = vi.fn()

      alice.chatRoom.on(ChatRoomEvent.PEER_LIST_CHANGE, onPeerListChange)

      // Every received message clears a typing flag that is usually already
      // clear. Re-rendering every subscriber for that is pure waste.
      alice.chatRoom.updatePeer('peer-1', { isTypingGroupMessage: false })

      expect(alice.chatRoom.getPeers()).toBe(peers)
      expect(onPeerListChange).not.toHaveBeenCalled()
    })
  })

  describe('leave', () => {
    it('stops processing transport traffic afterwards', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      await bob.chatRoom.leave()

      await alice.chatRoom.sendMessage('anyone there?')
      await settle()

      expect(bob.chatRoom.getMessageLog()).toHaveLength(0)
    })

    it('is idempotent', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()
      await alice.chatRoom.leave()

      await expect(alice.chatRoom.leave()).resolves.toBeUndefined()
    })

    it('stops seeding the files it was offering', async () => {
      const alice = createClient(network, 0)

      await alice.chatRoom.join()
      await alice.chatRoom.offerFiles([
        { name: 'doc.pdf', type: 'application/pdf', size: 1 },
      ])

      await alice.chatRoom.leave()

      // An offer is only reachable while we are in the room, so leaving it
      // seeding forever achieves nothing.
      expect(alice.fileTransfer.rescindAll).toHaveBeenCalled()
    })

    it('leaves the shared file transfer alone when a direct-message room closes', async () => {
      const alice = createClient(network, 0)
      const bob = createClient(network, 1)

      await joinAll(alice, bob)

      const aliceToBob = createDirectMessageRoom(alice, 0, 'peer-1')

      await aliceToBob.join()
      await aliceToBob.leave()

      // The DM room shares the group room's file transfer; rescinding here
      // would stop the group room's offers too.
      expect(alice.fileTransfer.rescindAll).not.toHaveBeenCalled()
    })
  })

  describe('errors', () => {
    it('reports a failed send instead of throwing out of sendMessage', async () => {
      const network2 = createInMemoryNetwork()
      const transport = new InMemoryTransport(network2, 'peer-0')
      const realMakeAction = transport.makeAction

      // Break only the MESSAGE sender, leaving the rest of the protocol intact.
      transport.makeAction = ((peerAction: PeerAction, namespace: string) => {
        const action = realMakeAction(peerAction, namespace)

        if (peerAction !== PeerAction.MESSAGE) return action

        return [
          async () => {
            throw new Error('transport is gone')
          },
          action[1],
          action[2],
          action[3],
        ]
      }) as typeof transport.makeAction

      const chatRoom = new ChatRoom({
        roomId,
        userId: 'user-0',
        customUsername: '',
        publicKey: keyPairs[0].publicKey,
        privateKey: keyPairs[0].privateKey,
        transport,
        adapters: createPlatformAdapters(makeIds()),
      })

      await chatRoom.join()

      const onError = vi.fn()

      chatRoom.on(ChatRoomEvent.ERROR, onError)

      await expect(
        chatRoom.sendMessage('does not throw')
      ).resolves.toBeUndefined()

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0][0]).toMatchObject({ context: 'sendMessage' })
      expect(onError.mock.calls[0][0].error.message).toBe('transport is gone')
      // The sending flag is released even on failure, so the UI does not wedge.
      expect(chatRoom.getIsMessageSending()).toBe(false)
    })
  })
})
