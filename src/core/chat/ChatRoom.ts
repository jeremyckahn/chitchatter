import { PlatformAdapters } from 'core/adapters/types'
import {
  ChatRoomErrorContext,
  ChatRoomEvent,
  ChatRoomEventPayloads,
} from 'core/chat/events'
import {
  FileHandle,
  FileOffers,
  applyFileOffer,
  generateFileKey,
  isEveryFileInlineMedia,
  isOfferedByAnotherPeer,
  removeFileOffer,
  shouldRescindOffer,
} from 'core/chat/fileOffers'
import {
  generateIdentityChallenge,
  deriveUserId,
  parsePeerPublicKey,
  signIdentityChallenge,
  verifyIdentityChallenge,
} from 'core/chat/identity'
import {
  applyPeerUpdate,
  findPeer,
  PeerStateUpdate,
  reconcilePeerMetadata,
  removePeer,
} from 'core/chat/peers'
import {
  IdentityChallenge,
  IdentityProof,
  UserMetadata,
} from 'core/chat/protocol'
import {
  parseFileOfferMetadata,
  parseIdentityChallenge,
  parseIdentityProof,
  parseTranscript,
  parseUnsentInlineMedia,
  parseUnsentMessage,
  parseUserMetadata,
} from 'core/chat/messageValidation'
import {
  applyTranscriptLimit,
  attributeOwnBackfill,
  getInlineMediaUris,
  settleAuthorVerification,
  withoutAuthorVerification,
} from 'core/chat/transcript'
import {
  heldMessageLimit,
  identityVerificationTimeout,
  messageTranscriptSizeLimit,
  typingStatusExpiry,
} from 'core/config/messaging'
import { EncryptionService, encryption } from 'core/crypto/Encryption'
import {
  FileOfferMetadata,
  FileReference,
  InlineMedia,
  isInlineMedia,
  isMessageReceived,
  Message,
  MessageLog,
  Peer,
  PeerVerificationState,
  ReceivedInlineMedia,
  ReceivedMessage,
  TypingStatus,
  UnsentInlineMedia,
  UnsentMessage,
} from 'core/models/chat'
import { PeerAction } from 'core/models/network'
import { getDisplayUsername, getPeerDisplayName } from 'core/names/peerNames'
import {
  ActionNamespace,
  ActionSender,
  PeerConnectionType,
  PeerHookType,
  PeerTransport,
} from 'core/transport/types'

export interface ChatRoomOptions {
  roomId: string
  userId: string
  customUsername: string
  publicKey: CryptoKey
  privateKey: CryptoKey
  transport: PeerTransport
  adapters: PlatformAdapters
  /** Set for a private room. Its presence is what makes the room private. */
  password?: string
  /** Set for a direct-message room. Its presence scopes every action to one peer. */
  targetPeerId?: string | null
  encryptionService?: EncryptionService
  transcriptSizeLimit?: number
  /** How long a peer has to answer an identity challenge, in milliseconds. */
  identityVerificationTimeout?: number
}

export interface SelfState {
  userId: string
  customUsername: string
  isTyping: boolean
}

/** What a frame that failed validation was meant to be, for the log line. */
enum MalformedFrame {
  MESSAGE = 'message',
  INLINE_MEDIA = 'inline media message',
  TRANSCRIPT = 'transcript',
  FILE_OFFER = 'file offer',
  METADATA = 'peer metadata',
  IDENTITY_CHALLENGE = 'identity challenge',
  IDENTITY_PROOF = 'identity proof',
}

/**
 * The identity a peer has announced, and where proving it stands.
 *
 * A claim is made by metadata and proven only by answering a challenge this
 * client chose for it. Its `userId` and `publicKey` are the ones the answer is
 * checked against, so the proof covers exactly what was announced.
 */
interface PeerIdentityClaim {
  /** The user id the peer's metadata names. */
  readonly claimedUserId: string
  /**
   * The user id its key derives, which is what the peer is listed and
   * verified as. Equal to `claimedUserId` for an honest peer.
   */
  readonly userId: string
  readonly publicKeyString: string
  readonly publicKey: CryptoKey
  /** The challenge awaiting an answer; `null` once answered or timed out. */
  pendingChallenge: string | null
  timeout: ReturnType<typeof setTimeout> | null
}

/**
 * A headless Chitchatter chat room.
 *
 * Owns the transcript, the peer list, presence and typing status, and speaks
 * the peer protocol over an injected {@link PeerTransport}. It has no DOM and
 * no framework: a React app, a terminal UI or a test subscribes to the same
 * events and calls the same methods.
 *
 * State is read through the `get*` snapshot methods, which return the identical
 * reference until the underlying data actually changes — the contract React's
 * `useSyncExternalStore` requires.
 *
 * Audio, video and screen share are deliberately absent. The core tracks
 * *that* a peer's media is playing (via `Peer.audioChannelState`, `videoState`
 * and `screenShareState`, which hosts update through {@link updatePeer}) but
 * never touches a MediaStream.
 */
export class ChatRoom extends EventTarget {
  readonly roomId: string

  readonly userId: string

  readonly isPrivate: boolean

  readonly isDirectMessageRoom: boolean

  readonly targetPeerId: string | null

  private readonly transport: PeerTransport

  private readonly adapters: PlatformAdapters

  private readonly encryptionService: EncryptionService

  private readonly publicKey: CryptoKey

  private readonly privateKey: CryptoKey

  private readonly namespace: ActionNamespace

  private readonly transcriptSizeLimit: number

  private readonly identityVerificationTimeout: number

  private customUsername: string

  private messageLog: MessageLog = []

  private peers: Peer[] = []

  private fileOffers: FileOffers = {}

  private isMessageSending = false

  private isTyping = false

  private typingExpiryTimer: ReturnType<typeof setTimeout> | null = null

  private selfFileOffer: Readonly<FileReference> | null = null

  /**
   * Magnets a peer announced as all inline media. Their torrents outlive the
   * offer, so a later claim on the same magnet cannot be used to destroy them.
   * Pruned once nothing is seeding a magnet and no peer offers it: see
   * {@link pruneRetainedMagnet}.
   */
  private retainedMagnetUris: Set<string> = new Set()

  private selfOfferedFiles: readonly FileHandle[] | null = null

  private hasJoined = false

  private hasLeft = false

  /**
   * Peers known to have left. Verification is asynchronous, so metadata can
   * still be in flight when its sender goes; without this the peer is
   * resurrected into the list as a ghost that never leaves again.
   */
  private departedPeerIds: Set<string> = new Set()

  /** Each peer's announced identity, keyed by peer id. */
  private identityClaims: Map<string, PeerIdentityClaim> = new Map()

  /**
   * The newest challenge each peer is waiting on us to answer. Only one answer
   * per peer is being signed at a time, and challenges that arrive meanwhile
   * replace one another here: a verifier only ever accepts its latest, so a
   * peer cannot make this client sign without limit.
   */
  private challengesToAnswer: Map<string, string> = new Map()

  /**
   * Live messages from peers not yet in the list, oldest first. They are
   * attributed once the sender's metadata lands: see {@link deliverFromPeer}.
   */
  private heldMessages: Map<string, Array<UnsentMessage | UnsentInlineMedia>> =
    new Map()

  /**
   * The messages each peer sent while its identity check was running, by the
   * author they were attributed to, so that they take on the verdict once it
   * lands: see {@link settleMessagesAwaitingVerdict}.
   */
  private messagesAwaitingVerdict: Map<
    string,
    { authorId: string; messageIds: Set<string> }
  > = new Map()

  /**
   * The backfill this client accepted, until the entries its sender wrote
   * itself have been attributed to it: see {@link attributeOwnBackfillOf}. A
   * transcript can arrive before its sender's metadata does, and only the
   * peer list says who that sender is.
   */
  private pendingBackfill: { peerId: string; entryIds: Set<string> } | null =
    null

  /** Our own public key as sent on the wire, exported once and reused. */
  private publicKeyString: Promise<string> | null = null

  // Snapshots are cached so that repeated reads without an intervening change
  // return the same reference.
  private messageLogSnapshot: MessageLog = []

  private peersSnapshot: readonly Peer[] = []

  private selfSnapshot: SelfState

  private connectionTypesSnapshot: Readonly<
    Record<string, PeerConnectionType>
  > = {}

  private senders: {
    message: ActionSender<UnsentMessage>
    inlineMedia: ActionSender<UnsentInlineMedia>
    transcript: ActionSender<Array<ReceivedMessage | ReceivedInlineMedia>>
    metadata: ActionSender<UserMetadata>
    identityChallenge: ActionSender<IdentityChallenge>
    identityProof: ActionSender<IdentityProof>
    typingStatus: ActionSender<TypingStatus>
    fileOffer: ActionSender<FileOfferMetadata | null>
  } | null = null

  private disconnectReceivers: Array<() => void> = []

  constructor({
    roomId,
    userId,
    customUsername,
    publicKey,
    privateKey,
    transport,
    adapters,
    password,
    targetPeerId = null,
    encryptionService = encryption,
    transcriptSizeLimit = messageTranscriptSizeLimit,
    identityVerificationTimeout:
      verificationTimeout = identityVerificationTimeout,
  }: ChatRoomOptions) {
    super()

    this.roomId = roomId
    this.userId = userId
    this.customUsername = customUsername
    this.publicKey = publicKey
    this.privateKey = privateKey
    this.transport = transport
    this.adapters = adapters
    this.encryptionService = encryptionService
    this.transcriptSizeLimit = transcriptSizeLimit
    this.identityVerificationTimeout = verificationTimeout

    this.isPrivate = password !== undefined
    this.targetPeerId = targetPeerId
    this.isDirectMessageRoom = typeof targetPeerId === 'string'
    this.namespace = this.isDirectMessageRoom
      ? ActionNamespace.DIRECT_MESSAGE
      : ActionNamespace.GROUP

    this.selfSnapshot = {
      userId,
      customUsername,
      isTyping: false,
    }
  }

  // ---------------------------------------------------------------- lifecycle

  /**
   * Binds the protocol to the transport and announces this peer.
   *
   * Handlers are registered exactly once, here — not during a render pass,
   * which is how the React version of this code used to do it.
   */
  join = async () => {
    if (this.hasJoined) return

    this.hasJoined = true

    const [sendMessage, connectMessage, , disconnectMessage] =
      this.transport.makeAction<UnsentMessage>(
        PeerAction.MESSAGE,
        this.namespace
      )
    const [sendInlineMedia, connectInlineMedia, , disconnectInlineMedia] =
      this.transport.makeAction<UnsentInlineMedia>(
        PeerAction.MEDIA_MESSAGE,
        this.namespace
      )
    const [sendTranscript, connectTranscript, , disconnectTranscript] =
      this.transport.makeAction<Array<ReceivedMessage | ReceivedInlineMedia>>(
        PeerAction.MESSAGE_TRANSCRIPT,
        this.namespace
      )
    const [sendMetadata, connectMetadata, , disconnectMetadata] =
      this.transport.makeAction<UserMetadata>(
        PeerAction.PEER_METADATA,
        this.namespace
      )
    const [
      sendIdentityChallenge,
      connectIdentityChallenge,
      ,
      disconnectIdentityChallenge,
    ] = this.transport.makeAction<IdentityChallenge>(
      PeerAction.IDENTITY_CHALLENGE,
      this.namespace
    )
    const [sendIdentityProof, connectIdentityProof, , disconnectIdentityProof] =
      this.transport.makeAction<IdentityProof>(
        PeerAction.IDENTITY_PROOF,
        this.namespace
      )
    const [sendTypingStatus, connectTypingStatus, , disconnectTypingStatus] =
      this.transport.makeAction<TypingStatus>(
        PeerAction.TYPING_STATUS_CHANGE,
        this.namespace
      )
    const [sendFileOffer, connectFileOffer, , disconnectFileOffer] =
      this.transport.makeAction<FileOfferMetadata | null>(
        PeerAction.FILE_OFFER,
        this.namespace
      )

    this.senders = {
      message: sendMessage,
      inlineMedia: sendInlineMedia,
      transcript: sendTranscript,
      metadata: sendMetadata,
      identityChallenge: sendIdentityChallenge,
      identityProof: sendIdentityProof,
      typingStatus: sendTypingStatus,
      fileOffer: sendFileOffer,
    }

    connectMessage(this.handleMessage)
    connectInlineMedia(this.handleInlineMedia)
    connectTranscript(this.handleTranscript)
    connectMetadata(this.handleMetadata)
    connectIdentityChallenge(this.handleIdentityChallenge)
    connectIdentityProof(this.handleIdentityProof)
    connectTypingStatus(this.handleTypingStatus)
    connectFileOffer(this.handleFileOffer)

    this.disconnectReceivers = [
      disconnectMessage,
      disconnectInlineMedia,
      disconnectTranscript,
      disconnectMetadata,
      disconnectIdentityChallenge,
      disconnectIdentityProof,
      disconnectTypingStatus,
      disconnectFileOffer,
    ]

    if (!this.isDirectMessageRoom) {
      this.transport.onPeerJoin(PeerHookType.NEW_PEER, this.handlePeerJoin)
      this.transport.onPeerLeave(PeerHookType.NEW_PEER, this.handlePeerLeave)
    }

    await this.announceSelf()
  }

  /**
   * Detaches this room's receivers. Does *not* tear down the transport: a
   * direct-message room shares one transport with the group room it was opened
   * from, so disposing of it is the host's decision, via
   * {@link PeerTransport.leaveRoom}.
   */
  leave = async () => {
    if (this.hasLeft) return

    this.hasLeft = true

    this.clearTypingExpiry()

    for (const peerId of [...this.identityClaims.keys()]) {
      this.forgetIdentityClaim(peerId)
    }

    this.heldMessages.clear()
    this.messagesAwaitingVerdict.clear()
    this.pendingBackfill = null

    if (this.isTyping) {
      await this.sendTypingStatus(false)
    }

    for (const disconnect of this.disconnectReceivers) disconnect()

    this.disconnectReceivers = []
    this.senders = null

    // Our file offers are only reachable while we are in the room, so leaving
    // ends the seeding. A direct-message room shares the group room's file
    // transfer, so only the group room may do this.
    if (!this.isDirectMessageRoom) {
      try {
        await this.adapters.fileTransfer.rescindAll()
      } catch (error) {
        this.reportError(error, ChatRoomErrorContext.LEAVE)
      }
    }
  }

  // ------------------------------------------------------------- state access

  getMessageLog = (): MessageLog => this.messageLogSnapshot

  getPeers = (): readonly Peer[] => this.peersSnapshot

  getSelf = (): Readonly<SelfState> => this.selfSnapshot

  getConnectionTypes = (): Readonly<Record<string, PeerConnectionType>> =>
    this.connectionTypesSnapshot

  getIsMessageSending = () => this.isMessageSending

  getFileOffers = (): FileOffers => this.fileOffers

  getSelfFileOfferMagnetUri = () => this.selfFileOffer?.magnetURI ?? null

  /**
   * The one place our own offer is recorded, so that every change announces
   * itself. A host's stop-sharing control reads
   * {@link getSelfFileOfferMagnetUri} on this event; writing the field
   * directly would leave it showing a share that no longer exists, or none
   * where one does.
   */
  private setSelfFileOffer = (
    offer: Readonly<FileReference> | null,
    files: readonly FileHandle[] | null
  ) => {
    const magnetURI = offer?.magnetURI ?? null
    const hasChanged = this.getSelfFileOfferMagnetUri() !== magnetURI

    this.selfFileOffer = offer
    this.selfOfferedFiles = files

    if (hasChanged)
      this.emit(ChatRoomEvent.SELF_FILE_OFFER_CHANGE, { magnetURI })
  }

  // ------------------------------------------------------------------ typed events

  on = <T extends ChatRoomEvent>(
    event: T,
    listener: (payload: ChatRoomEventPayloads[T]) => void
  ) => {
    const handler = (e: Event) => {
      listener((e as CustomEvent<ChatRoomEventPayloads[T]>).detail)
    }

    this.addEventListener(event, handler)

    return () => {
      this.removeEventListener(event, handler)
    }
  }

  private emit = <T extends ChatRoomEvent>(
    event: T,
    payload: ChatRoomEventPayloads[T]
  ) => {
    this.dispatchEvent(new CustomEvent(event, { detail: payload }))
  }

  // ------------------------------------------------------------------ commands

  sendMessage = async (text: string) => {
    if (this.isMessageSending || this.hasLeft) return

    const unsentMessage: UnsentMessage = {
      authorId: this.userId,
      text,
      timeSent: this.adapters.clock.now(),
      id: this.adapters.ids.uuid(),
    }

    this.stopTyping()
    this.setIsMessageSending(true)
    this.appendToMessageLog(unsentMessage)

    try {
      await this.senders?.message(unsentMessage, this.sendOptions())
      this.markOwnMessageDelivered(unsentMessage.id)
    } catch (error) {
      this.reportError(error, ChatRoomErrorContext.SEND_MESSAGE)
    } finally {
      this.setIsMessageSending(false)
    }
  }

  /**
   * Offers `files` to the room and posts them into the transcript as inline
   * media.
   */
  sendInlineMedia = async (files: readonly FileHandle[]) => {
    if (this.hasLeft) return

    this.setIsMessageSending(true)

    try {
      const fileKey = generateFileKey()
      const magnetURI = await this.adapters.fileTransfer.offer(files, fileKey)

      const unsentInlineMedia: UnsentInlineMedia = {
        authorId: this.userId,
        magnetURI,
        fileKey,
        timeSent: this.adapters.clock.now(),
        id: this.adapters.ids.uuid(),
      }

      this.appendToMessageLog(unsentInlineMedia)

      await this.senders?.inlineMedia(unsentInlineMedia, this.sendOptions())
      this.markOwnMessageDelivered(unsentInlineMedia.id)
    } catch (error) {
      this.reportError(error, ChatRoomErrorContext.SEND_INLINE_MEDIA)
    } finally {
      this.setIsMessageSending(false)
    }
  }

  /**
   * Reports local typing activity. Safe and cheap to call on every keystroke:
   * the first call announces typing immediately, and subsequent calls only push
   * back the expiry.
   */
  notifyTyping = () => {
    if (this.hasLeft) return

    if (!this.isTyping) {
      this.isTyping = true
      this.updateSelfSnapshot()
      void this.sendTypingStatus(true)
    }

    this.clearTypingExpiry()

    this.typingExpiryTimer = setTimeout(() => {
      this.stopTyping()
    }, typingStatusExpiry)
  }

  setCustomUsername = async (customUsername: string) => {
    if (this.customUsername === customUsername) return

    this.customUsername = customUsername
    this.updateSelfSnapshot()

    await this.announceSelf()
  }

  /**
   * Applies host-owned state to a peer — media status from the web app's audio,
   * video and screen-share hooks, which the core does not itself observe.
   */
  updatePeer = (peerId: string, updates: PeerStateUpdate) => {
    const existing = findPeer(this.peers, peerId)

    if (!existing) return

    // Compared by value, not by reference: `applyPeerUpdate` always clones the
    // peer it touches, so a reference check can never see a no-op. Most updates
    // are no-ops — every received message clears a typing flag that is usually
    // already clear — and each one would otherwise re-render every subscriber.
    const isUnchanged = Object.entries(updates).every(
      ([key, value]) => existing[key as keyof PeerStateUpdate] === value
    )

    if (isUnchanged) return

    this.setPeers(applyPeerUpdate(this.peers, peerId, updates))
  }

  /**
   * Offers `files` to the room and returns the magnet URI peers can fetch them
   * by — or `undefined` when the room has already been left and there was
   * nothing to offer them to. A caller showing a "stop sharing" control has to
   * tell those apart: `undefined` means no share exists to stop.
   */
  offerFiles = async (
    files: readonly FileHandle[]
  ): Promise<string | undefined> => {
    if (this.hasLeft) return

    const fileKey = generateFileKey()
    const magnetURI = await this.adapters.fileTransfer.offer(files, fileKey)

    this.setSelfFileOffer({ magnetURI, fileKey }, files)

    try {
      await this.senders?.fileOffer(
        { magnetURI, fileKey, isAllInlineMedia: isEveryFileInlineMedia(files) },
        this.sendOptions()
      )
    } catch (error) {
      // The torrent exists by now, but nobody was told about it. Left seeding
      // it would still be handed to every future joiner by `greetPeer`, while
      // the caller reports the share as failed and has no stop control left to
      // undo it with. Unlike `rescindFileOffer` this does not spare inline
      // media, because the transcript entry that would keep needing it is only
      // created once this send has succeeded.
      this.setSelfFileOffer(null, null)

      this.stopSeeding(magnetURI)

      throw error
    }

    return magnetURI
  }

  rescindFileOffer = async () => {
    const magnetURI = this.getSelfFileOfferMagnetUri()

    if (!magnetURI) return

    const isAllInlineMedia = isEveryFileInlineMedia(this.selfOfferedFiles)

    // Cleared before anything that can fail: the user asked to stop sharing, so
    // the room stops offering whether or not the announcement gets through.
    // Holding the state until it does would wedge the stop control while the
    // file kept seeding, with nothing left able to rescind it.
    this.setSelfFileOffer(null, null)

    // Two things can fail here, telling the peers and stopping the seed, but
    // they are one action to the user, so only the first failure is reported.
    let failure: unknown = null

    try {
      await this.senders?.fileOffer(null, this.sendOptions())
    } catch (error) {
      failure = error
    }

    // Inline media stays seeded: it is still in the transcript on both sides,
    // where it has to remain reachable.
    if (!isAllInlineMedia && this.adapters.fileTransfer.isOffering(magnetURI)) {
      try {
        await this.adapters.fileTransfer.rescind(magnetURI)
      } catch (error) {
        failure ??= error
      }
    }

    if (failure !== null) {
      this.reportError(failure, ChatRoomErrorContext.RESCIND_FILE_OFFER)
    }
  }

  /** Refreshes the direct-vs-relay classification for the current peers. */
  refreshConnectionTypes = async () => {
    try {
      const connectionTypes = await this.transport.getPeerConnectionTypes()

      this.connectionTypesSnapshot = { ...connectionTypes }
      this.emit(ChatRoomEvent.CONNECTION_TYPES_CHANGE, { connectionTypes })
    } catch (error) {
      this.reportError(error, ChatRoomErrorContext.REFRESH_CONNECTION_TYPES)
    }
  }

  // ------------------------------------------------------------------ handlers

  private handleMessage = (
    payload: unknown,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const message = parseUnsentMessage(payload)

    if (!message) {
      this.warnMalformed(MalformedFrame.MESSAGE, peerId)

      return
    }

    this.deliverFromPeer(peerId, message)
  }

  private handleInlineMedia = (
    payload: unknown,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const inlineMedia = parseUnsentInlineMedia(payload)

    if (!inlineMedia) {
      this.warnMalformed(MalformedFrame.INLINE_MEDIA, peerId)

      return
    }

    this.deliverFromPeer(peerId, inlineMedia)
  }

  /**
   * Adds a live message to the transcript under the identity of the peer that
   * sent it.
   *
   * The `authorId` a message carries is the sender's say-so, so it is never
   * used: a peer could otherwise write into the transcript as anyone. The
   * author is the user id of the sending connection's entry in the peer list,
   * which is what the identity check (see {@link handleMetadata}) vouches
   * for. A message from a peer not in the list yet is held until its metadata
   * arrives, since there is nobody to attribute it to.
   */
  private deliverFromPeer = (
    peerId: string,
    message: UnsentMessage | UnsentInlineMedia
  ) => {
    const sender = findPeer(this.peers, peerId)

    if (!sender) {
      this.holdMessage(peerId, message)

      return
    }

    if (message.authorId !== sender.userId) {
      this.adapters.logger.warn(
        `Peer ${peerId} sent a message as another author; attributing it to the sender`
      )
    }

    const received: ReceivedMessage | ReceivedInlineMedia = {
      ...message,
      authorId: sender.userId,
      timeReceived: this.adapters.clock.now(),
      authorVerificationState: sender.verificationState,
    }

    if (sender.verificationState === PeerVerificationState.VERIFYING) {
      this.awaitVerdict(peerId, received)
    }

    this.appendToMessageLog(received)

    if (!isInlineMedia(received)) {
      this.updatePeer(peerId, { isTypingGroupMessage: false })
    }

    this.emit(ChatRoomEvent.MESSAGE_RECEIVED, { message: received, peerId })
  }

  private awaitVerdict = (
    peerId: string,
    { id, authorId }: ReceivedMessage | ReceivedInlineMedia
  ) => {
    const awaiting = this.messagesAwaitingVerdict.get(peerId)

    if (awaiting?.authorId === authorId) {
      awaiting.messageIds.add(id)

      return
    }

    this.messagesAwaitingVerdict.set(peerId, {
      authorId,
      messageIds: new Set([id]),
    })
  }

  /**
   * Marks what a peer sent while its identity check was running with the
   * check's verdict: VERIFIED only if the peer went on to prove its identity.
   * A peer that left, or that switched to another identity, before proving
   * the one it wrote under never did, so its messages are UNVERIFIED.
   */
  private settleMessagesAwaitingVerdict = (
    peerId: string,
    verificationState: PeerVerificationState
  ) => {
    const awaiting = this.messagesAwaitingVerdict.get(peerId)

    if (!awaiting) return

    this.messagesAwaitingVerdict.delete(peerId)
    this.setMessageLog(
      settleAuthorVerification(this.messageLog, {
        ...awaiting,
        verificationState,
      })
    )
  }

  private holdMessage = (
    peerId: string,
    message: UnsentMessage | UnsentInlineMedia
  ) => {
    if (this.departedPeerIds.has(peerId)) return

    const held = this.heldMessages.get(peerId) ?? []

    if (held.length >= heldMessageLimit) {
      this.adapters.logger.warn(
        `Discarded a message from peer ${peerId}, which has not announced itself`
      )

      return
    }

    this.heldMessages.set(peerId, [...held, message])
  }

  /** Delivers what a newly listed peer sent before it was known. */
  private releaseHeldMessages = (peerId: string) => {
    const held = this.heldMessages.get(peerId)

    if (!held) return

    this.heldMessages.delete(peerId)

    for (const message of held) this.deliverFromPeer(peerId, message)
  }

  /**
   * Backfills an empty log with the history a peer hands over on arrival.
   *
   * What this does and does not establish, since the answer is not obvious:
   *
   * - The *shape* is established. The payload arrives as `unknown`, is cut to
   *   the most recent entries the log can hold before any of them is looked
   *   at, and each survivor is rebuilt from validated fields only.
   * - The *content* is not, and cannot be. Messages are not signed and a user
   *   id is a public label, so the peer that answers first can attribute
   *   anything to anyone, date it as it likes and invent messages outright. A
   *   receiver has nothing to check against, and the identity check that exists
   *   (see {@link verifyIdentityChallenge}) proves only that a peer holds *a*
   *   key.
   *   Picking whom to believe does not help either: a peer that has been
   *   verified is one that signed its own advertised id, and requiring several
   *   peers to agree would leave a room of two with no history at all. Closing
   *   this needs signed messages, which is a protocol change.
   * - Nothing a transcript says may *act on* this client beyond showing the
   *   history. In particular an entry naming a torrent must not be able to end
   *   a seed: see {@link stopSeedingEvictedMedia}.
   */
  private handleTranscript = (
    payload: unknown,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    // A transcript only backfills an empty log; it never overwrites messages
    // this peer already has.
    if (this.messageLog.length) return

    const parsed = parseTranscript(payload, {
      limit: this.transcriptSizeLimit,
      receivedAt: this.adapters.clock.now(),
    })

    if (!parsed) {
      this.warnMalformed(MalformedFrame.TRANSCRIPT, peerId)

      return
    }

    if (parsed.discardedCount > 0) {
      this.adapters.logger.warn(
        `Discarded ${parsed.discardedCount} entries of the transcript from peer ${peerId}`
      )
    }

    // An empty backfill changes nothing, and must not use up the chance of a
    // later peer's: the log is still empty.
    if (!parsed.messageLog.length) return

    for (const message of parsed.messageLog) {
      if (isInlineMedia(message)) {
        this.adapters.fileTransfer.trackInlineMedia(message.magnetURI)
      }
    }

    this.setMessageLog(parsed.messageLog)

    this.pendingBackfill = {
      peerId,
      entryIds: new Set(parsed.messageLog.map(({ id }) => id)),
    }
    this.attributeOwnBackfillOf(peerId)
  }

  /**
   * Attributes the entries of the accepted backfill that name its sender as
   * author to that sender, as if it had sent them live: they take on its
   * verification state, and the verdict if its check is still running. Runs
   * when the backfill lands and again when its sender is listed, whichever
   * comes second does the work.
   */
  private attributeOwnBackfillOf = (peerId: string) => {
    if (this.pendingBackfill?.peerId !== peerId) return

    const sender = findPeer(this.peers, peerId)

    if (!sender) return

    const { entryIds } = this.pendingBackfill

    this.pendingBackfill = null

    const { messageLog, attributed } = attributeOwnBackfill(this.messageLog, {
      entryIds,
      authorId: sender.userId,
      verificationState: sender.verificationState,
    })

    if (!attributed.length) return

    if (sender.verificationState === PeerVerificationState.VERIFYING) {
      for (const entry of attributed) this.awaitVerdict(peerId, entry)
    }

    this.setMessageLog(messageLog)
  }

  private warnMalformed = (what: MalformedFrame, peerId: string) => {
    this.adapters.logger.warn(`Ignored a malformed ${what} from peer ${peerId}`)
  }

  /**
   * Folds a peer's announcement into the peer list and, when it claims an
   * identity this client has not yet checked, challenges the peer to prove it.
   *
   * Metadata proves nothing by itself. Anything signed once and broadcast can
   * be replayed by whoever received it, so a peer is only marked VERIFIED by
   * {@link handleIdentityProof}, once it has signed a challenge chosen here for
   * this connection. Until then it is listed as VERIFYING.
   *
   * A peer is always listed under the user id its public key derives (see
   * {@link deriveUserId}), not the one it names. One that names a different
   * id is marked UNVERIFIED at once and never challenged: proving possession
   * of a key says nothing about an id that belongs to another.
   */
  private handleMetadata = async (
    payload: unknown,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const metadata = parseUserMetadata(payload)

    if (!metadata) {
      this.warnMalformed(MalformedFrame.METADATA, peerId)

      return
    }

    const { userId, customUsername, publicKeyString } = metadata

    const knownClaim = this.findRepeatedClaim(peerId, metadata)
    const publicKey =
      knownClaim?.publicKey ??
      (await parsePeerPublicKey(this.encryptionService, publicKeyString))

    if (!publicKey) {
      this.adapters.logger.warn(
        `Could not parse the public key advertised by peer ${peerId}; ignoring its metadata`
      )

      return
    }

    // The peer is listed under the id its key derives, whatever id it named.
    // A peer that names another user's id can then never appear as them: not
    // in the peer list, and not as the author of what it sends.
    const listedUserId =
      knownClaim?.userId ?? (await deriveUserId(publicKeyString))
    const isUserIdBoundToKey = userId === listedUserId

    // Deliberately not `transport.getPeers().includes(peerId)`: that couples
    // correctness to transport timing and drops metadata from a live peer whose
    // connection has not yet surfaced in the transport's peer list.
    if (this.hasLeft || this.departedPeerIds.has(peerId)) return

    // Resolved from the peer this metadata belongs to, found by `peerId`. The
    // incoming `userId` is the *new* identity, so looking the previous name up
    // by it reports a name the user has never seen — `Breezy Bear is now Alice
    // (Breezy Bear)` — whenever a settings import changes the user id.
    const previousPeer = findPeer(this.peers, peerId)

    // Checked after the await above, so that a duplicate greeting that arrived
    // while the key was parsing does not issue a second challenge.
    const isNewClaim =
      previousPeer === null || this.findRepeatedClaim(peerId, metadata) === null

    if (isNewClaim) {
      this.settleMessagesAwaitingVerdict(
        peerId,
        PeerVerificationState.UNVERIFIED
      )
      this.forgetIdentityClaim(peerId)
      this.identityClaims.set(peerId, {
        claimedUserId: userId,
        userId: listedUserId,
        publicKeyString,
        publicKey,
        pendingChallenge: null,
        timeout: null,
      })
    }

    const getVerificationState = (): PeerVerificationState => {
      if (!isNewClaim && previousPeer) return previousPeer.verificationState

      // A peer that named an id other than its own is misrepresenting itself
      // even though it is listed under its own: it is shown as unverified and
      // never challenged, so no proof is accepted for it.
      return isUserIdBoundToKey
        ? PeerVerificationState.VERIFYING
        : PeerVerificationState.UNVERIFIED
    }

    const verificationState = getVerificationState()

    const { peers, addedPeer, rename } = reconcilePeerMetadata(this.peers, {
      peerId,
      userId: listedUserId,
      customUsername,
      publicKey,
      verificationState,
    })

    this.setPeers(peers)
    this.releaseHeldMessages(peerId)
    this.attributeOwnBackfillOf(peerId)

    if (isNewClaim) {
      if (isUserIdBoundToKey) {
        void this.challengePeerIdentity(peerId)
      } else {
        this.adapters.logger.warn(
          `Peer ${peerId} claims a user id that does not belong to its public key; listing it under the key's own`
        )
        this.reportVerification(peerId, verificationState)
      }
    }

    if (addedPeer) {
      // This peer may not know us either — its transport could have connected
      // before our room was listening, so the greeting we sent on its join
      // went nowhere. Greet it now that we have proof it is there.
      void this.greetPeer(peerId)

      // Tell the newcomer whether we are mid-sentence, so its typing indicator
      // starts out correct rather than waiting for our next keystroke.
      await this.sendTypingStatus(this.isTyping, peerId)
    } else if (rename && previousPeer) {
      this.emit(ChatRoomEvent.PEER_RENAME, {
        peerId,
        previousDisplayName: getPeerDisplayName(previousPeer),
        displayName: getDisplayUsername(listedUserId, {
          selfUserId: this.userId,
          selfCustomUsername: this.customUsername,
          peers,
        }),
      })
    }
  }

  /**
   * The claim a peer's metadata repeats, already parsed and judged, or `null`
   * when the metadata claims something new.
   */
  private findRepeatedClaim = (
    peerId: string,
    { userId, publicKeyString }: UserMetadata
  ): PeerIdentityClaim | null => {
    const claim = this.identityClaims.get(peerId)

    if (
      !claim ||
      claim.claimedUserId !== userId ||
      claim.publicKeyString !== publicKeyString
    ) {
      return null
    }

    return claim
  }

  /**
   * Sends `peerId` a fresh challenge for the identity it claims, and gives it
   * {@link identityVerificationTimeout} to answer.
   */
  private challengePeerIdentity = async (peerId: string) => {
    const claim = this.identityClaims.get(peerId)

    if (!claim || !this.senders) return

    const challenge = generateIdentityChallenge()

    claim.pendingChallenge = challenge
    claim.timeout = setTimeout(() => {
      if (this.identityClaims.get(peerId) !== claim) return
      if (claim.pendingChallenge !== challenge) return

      claim.pendingChallenge = null
      claim.timeout = null

      this.adapters.logger.warn(
        `Peer ${peerId} did not answer its identity challenge in time`
      )
      this.settleVerification(peerId, PeerVerificationState.UNVERIFIED)
    }, this.identityVerificationTimeout)

    try {
      await this.senders.identityChallenge({ challenge }, { target: peerId })
    } catch (error) {
      this.reportError(error, ChatRoomErrorContext.CHALLENGE_PEER_IDENTITY)
    }
  }

  /**
   * Proves our identity to a peer that challenged it, by signing its challenge
   * together with the room id, our user id and our own peer id.
   */
  private handleIdentityChallenge = async (
    payload: unknown,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const parsed = parseIdentityChallenge(payload)

    if (!parsed) {
      this.warnMalformed(MalformedFrame.IDENTITY_CHALLENGE, peerId)

      return
    }

    const isAnswering = this.challengesToAnswer.has(peerId)

    this.challengesToAnswer.set(peerId, parsed.challenge)

    // Already answering this peer: the loop below picks this one up next.
    if (isAnswering) return

    for (
      let challenge = this.challengesToAnswer.get(peerId);
      challenge !== undefined && !this.hasLeft;
      challenge = this.takeNewerChallenge(peerId, challenge)
    ) {
      await this.answerIdentityChallenge(peerId, challenge)
    }

    this.challengesToAnswer.delete(peerId)
  }

  /**
   * The challenge that arrived from `peerId` while `answered` was being
   * answered, or `undefined` when there is none.
   */
  private takeNewerChallenge = (peerId: string, answered: string) => {
    const latest = this.challengesToAnswer.get(peerId)

    return latest === answered ? undefined : latest
  }

  private answerIdentityChallenge = async (
    peerId: string,
    challenge: string
  ) => {
    try {
      const identitySignatureBase64 = await signIdentityChallenge({
        encryptionService: this.encryptionService,
        privateKey: this.privateKey,
        statement: {
          roomId: this.roomId,
          userId: this.userId,
          proverPeerId: this.transport.selfId,
          challenge,
        },
      })

      await this.senders?.identityProof(
        { challenge, identitySignatureBase64 },
        { target: peerId }
      )
    } catch (error) {
      this.reportError(error, ChatRoomErrorContext.ANSWER_IDENTITY_CHALLENGE)
    }
  }

  /**
   * Checks a peer's answer to the challenge this client sent it.
   *
   * The answer is accepted only for the challenge still outstanding for that
   * peer, and only once: a proof for any other challenge — a stale one, one
   * sent to somebody else, or one already used — is discarded. The statement
   * it is checked against is built here, from the identity the peer claimed
   * and the peer id the answer arrived from, never from the answer itself.
   */
  private handleIdentityProof = async (
    payload: unknown,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const proof = parseIdentityProof(payload)

    if (!proof) {
      this.warnMalformed(MalformedFrame.IDENTITY_PROOF, peerId)

      return
    }

    const claim = this.identityClaims.get(peerId)

    if (!claim || claim.pendingChallenge !== proof.challenge) {
      this.adapters.logger.warn(
        `Ignored an identity proof from peer ${peerId} that answers no outstanding challenge`
      )

      return
    }

    // Spent before the await, so the same answer cannot be checked twice.
    claim.pendingChallenge = null
    this.clearIdentityTimeout(claim)

    const verificationState = await verifyIdentityChallenge({
      encryptionService: this.encryptionService,
      publicKey: claim.publicKey,
      identitySignatureBase64: proof.identitySignatureBase64,
      statement: {
        roomId: this.roomId,
        userId: claim.userId,
        proverPeerId: peerId,
        challenge: proof.challenge,
      },
    })

    // The peer may have left, or announced a different identity, while the
    // signature was being checked. Either way this result no longer applies.
    if (this.hasLeft || this.identityClaims.get(peerId) !== claim) return

    this.settleVerification(peerId, verificationState)
  }

  /** Records a verdict on a listed peer, then reports it. */
  private settleVerification = (
    peerId: string,
    verificationState: PeerVerificationState
  ) => {
    if (!findPeer(this.peers, peerId)) return

    this.setPeers(applyPeerUpdate(this.peers, peerId, { verificationState }))
    this.settleMessagesAwaitingVerdict(peerId, verificationState)
    this.reportVerification(peerId, verificationState)
  }

  /** Logs and announces a verdict already in the peer list. */
  private reportVerification = (
    peerId: string,
    verificationState: PeerVerificationState
  ) => {
    if (verificationState === PeerVerificationState.UNVERIFIED) {
      this.adapters.logger.warn(
        'Peer verification failed, marking peer as unverified'
      )
    }

    this.emit(ChatRoomEvent.PEER_VERIFICATION, { peerId, verificationState })
  }

  private clearIdentityTimeout = (claim: PeerIdentityClaim) => {
    if (claim.timeout === null) return

    clearTimeout(claim.timeout)
    claim.timeout = null
  }

  /** Drops a peer's claim, so that any answer still in flight is discarded. */
  private forgetIdentityClaim = (peerId: string) => {
    const claim = this.identityClaims.get(peerId)

    if (!claim) return

    this.clearIdentityTimeout(claim)
    this.identityClaims.delete(peerId)
  }

  private handleTypingStatus = (
    { isTyping }: TypingStatus,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    this.updatePeer(peerId, {
      isTypingGroupMessage: isTyping && !this.isDirectMessageRoom,
      isTypingDirectMessage: isTyping && this.isDirectMessageRoom,
    })

    this.emit(ChatRoomEvent.TYPING_STATUS_CHANGE, { peerId, isTyping })
  }

  private handleFileOffer = (
    payload: unknown,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    // `null` is a withdrawal. Anything else has to be a complete offer, rebuilt
    // from checked fields: one without a usable key could never be downloaded.
    const metadata = payload === null ? null : parseFileOfferMetadata(payload)

    if (payload !== null && !metadata) {
      this.warnMalformed(MalformedFrame.FILE_OFFER, peerId)

      return
    }

    if (metadata) {
      const replaced = this.fileOffers[peerId]

      if (metadata.isAllInlineMedia) {
        this.retainedMagnetUris.add(metadata.magnetURI)
      }

      this.fileOffers = applyFileOffer(this.fileOffers, peerId, metadata)

      if (replaced && replaced.magnetURI !== metadata.magnetURI) {
        this.pruneRetainedMagnet(peerId, replaced.magnetURI)
      }
    } else {
      const withdrawn = this.fileOffers[peerId]

      if (this.shouldStopSeedingOffer(peerId, withdrawn)) {
        this.stopSeeding(withdrawn.magnetURI)
      }

      this.fileOffers = removeFileOffer(this.fileOffers, peerId)

      if (withdrawn) this.pruneRetainedMagnet(peerId, withdrawn.magnetURI)
    }

    // `updatePeer` skips no-op updates by reference, so a repeated offer has
    // to reuse the reference the peer already holds, or every greeting that
    // re-sends it would re-render the peer list.
    const current = findPeer(this.peers, peerId)?.offeredFile ?? null
    const isSameOffer =
      metadata !== null &&
      current?.magnetURI === metadata.magnetURI &&
      current.fileKey === metadata.fileKey

    this.updatePeer(peerId, {
      offeredFile: isSameOffer
        ? current
        : metadata && {
            magnetURI: metadata.magnetURI,
            fileKey: metadata.fileKey,
          },
    })
    this.emit(ChatRoomEvent.FILE_OFFER_CHANGE, { peerId, metadata })
  }

  /**
   * Whether a peer's withdrawn (or departed) offer means this client should
   * stop seeding it. Decided from this client's own records, not from anything
   * the peer wrote: see {@link shouldRescindOffer}.
   */
  private shouldStopSeedingOffer = (
    peerId: string,
    offer: FileOfferMetadata | undefined
  ) => {
    // A direct-message room cannot tell which torrents its peer's offer made
    // this client seed: downloads happen outside the core, and the file
    // transfer it would rescind through is shared with the group room, so a
    // magnet the peer names may well be one this client re-seeds for the group.
    // Stopping on its say-so would hand every DM peer a way to destroy those.
    // Leaving the group room still ends all seeding.
    if (this.isDirectMessageRoom) return false

    return shouldRescindOffer(
      offer,
      this.adapters.fileTransfer.isOffering,
      magnetURI =>
        this.isProtectedFromPeerRescind(magnetURI) ||
        isOfferedByAnotherPeer(this.fileOffers, peerId, magnetURI)
    )
  }

  /**
   * Forgets a retained magnet once there is nothing left for the retention to
   * protect: this client is not seeding it and no present peer offers it.
   *
   * The set is filled from a flag the offering peer writes, so left alone it
   * grows with every flagged offer a peer sends for the whole session. Pruning
   * keeps it to the offers that are live and the torrents this client seeds.
   * Called with the peer whose offer just ended or was replaced; `peerId` is
   * excluded from the "somebody else still offers it" check, as it no longer
   * does.
   */
  private pruneRetainedMagnet = (peerId: string, magnetURI: string) => {
    if (!this.retainedMagnetUris.has(magnetURI)) return
    if (this.adapters.fileTransfer.isOffering(magnetURI)) return
    if (isOfferedByAnotherPeer(this.fileOffers, peerId, magnetURI)) return

    this.retainedMagnetUris.delete(magnetURI)
  }

  private isProtectedFromPeerRescind = (magnetURI: string) =>
    this.adapters.fileTransfer.isOriginated(magnetURI) ||
    this.retainedMagnetUris.has(magnetURI) ||
    // Checked against the adapter as well as this room's own transcript: a
    // direct-message room's images are in a transcript this room cannot see.
    this.adapters.fileTransfer.isInlineMedia(magnetURI) ||
    getInlineMediaUris(this.messageLog).includes(magnetURI)

  private handlePeerJoin = (peerId: string) => {
    this.departedPeerIds.delete(peerId)
    this.emit(ChatRoomEvent.PEER_JOIN, { peerId })

    void this.greetPeer(peerId)
  }

  /**
   * Introduces this peer to `peerId` and hands over whatever it is owed on
   * arrival: our identity, the room's history, and any file we are offering.
   *
   * Called both when the transport reports a join and when a peer we did not
   * know announces itself. Either trigger alone is insufficient: a peer's
   * transport can connect — firing the other side's join handler — before its
   * own room is listening, so the greeting it was sent is lost. Running this
   * from both makes the exchange independent of who was ready first.
   *
   * It settles rather than looping: a greeting only provokes a greeting back
   * when the recipient did not already know the sender.
   */
  private greetPeer = async (peerId: string) => {
    try {
      // Sent concurrently, so that exporting our public key for the first time
      // does not delay the newcomer's transcript.
      await Promise.all([
        this.announceSelf(peerId),

        // Public rooms backfill history for newcomers. Private rooms do not:
        // joining with the password should not hand over what was said before.
        // Neither do direct-message rooms, whose history belongs to the two
        // people in it and is already on both sides.
        this.isPrivate || this.isDirectMessageRoom
          ? Promise.resolve()
          : this.senders?.transcript(
              this.messageLog
                .filter(isMessageReceived)
                .map(withoutAuthorVerification),
              { target: peerId }
            ),

        this.selfFileOffer
          ? this.senders?.fileOffer(
              {
                magnetURI: this.selfFileOffer.magnetURI,
                fileKey: this.selfFileOffer.fileKey,
                isAllInlineMedia: isEveryFileInlineMedia(this.selfOfferedFiles),
              },
              { target: peerId }
            )
          : Promise.resolve(),
      ])
    } catch (error) {
      this.reportError(error, ChatRoomErrorContext.GREET_PEER)
    }
  }

  private handlePeerLeave = (peerId: string) => {
    this.departedPeerIds.add(peerId)
    this.forgetIdentityClaim(peerId)
    this.heldMessages.delete(peerId)

    // A sender that leaves before announcing itself never said who it was, so
    // nothing it handed over can be attributed to it.
    if (this.pendingBackfill?.peerId === peerId) this.pendingBackfill = null
    this.settleMessagesAwaitingVerdict(peerId, PeerVerificationState.UNVERIFIED)

    const peer = findPeer(this.peers, peerId)
    const offer = this.fileOffers[peerId]

    if (this.shouldStopSeedingOffer(peerId, offer)) {
      this.stopSeeding(offer.magnetURI)
    }

    // Announced like any other change to the offer snapshot: subscribers re-read
    // it on this event and nothing else, so dropping the offer silently would
    // leave them holding a departed peer's.
    if (offer) {
      this.fileOffers = removeFileOffer(this.fileOffers, peerId)
      this.pruneRetainedMagnet(peerId, offer.magnetURI)
      this.emit(ChatRoomEvent.FILE_OFFER_CHANGE, { peerId, metadata: null })
    }

    if (peer) this.setPeers(removePeer(this.peers, peerId))

    this.emit(ChatRoomEvent.PEER_LEAVE, { peerId, peer })
  }

  /**
   * Tells this room that `peerId` is gone.
   *
   * A direct-message room cannot learn this from the transport: there is one
   * peer-leave slot per {@link PeerHookType} and the group room holds it, so
   * registering a second handler would clobber the first. {@link
   * ChatRoomRegistry} forwards the group room's departures instead. Without it
   * a conversation keeps its correspondent indefinitely, typing status and all.
   */
  notifyPeerLeft = (peerId: string) => {
    this.handlePeerLeave(peerId)
  }

  /**
   * Tells this room that `peerId` is back — the mirror of {@link
   * notifyPeerLeft}, forwarded by {@link ChatRoomRegistry} for the same reason.
   *
   * It has to exist because {@link notifyPeerLeft} is a one-way door otherwise:
   * a departure is remembered so that metadata still in flight cannot
   * resurrect a peer that has gone, and only a join clears that. A
   * direct-message room never hears a join from the transport, so without this
   * a correspondent whose connection blips returns under the same peer id and
   * has their metadata discarded for the rest of the session — the conversation
   * keeps working but loses its peer, and with it the typing indicator.
   */
  notifyPeerJoined = (peerId: string) => {
    this.handlePeerJoin(peerId)
  }

  // ------------------------------------------------------------------ internals

  /**
   * Announces who we claim to be. It carries no proof: every peer that hears
   * it challenges us, and {@link handleIdentityChallenge} answers.
   */
  private announceSelf = async (targetPeerId?: string) => {
    if (!this.senders) return

    try {
      this.publicKeyString ??= this.encryptionService.stringifyCryptoKey(
        this.publicKey
      )

      const publicKeyString = await this.publicKeyString

      await this.senders?.metadata(
        {
          userId: this.userId,
          customUsername: this.customUsername,
          publicKeyString,
        },
        targetPeerId ? { target: targetPeerId } : this.sendOptions()
      )
    } catch (error) {
      // Not cached as a failure: the next announcement tries again.
      this.publicKeyString = null
      this.reportError(error, ChatRoomErrorContext.ANNOUNCE_SELF)
    }
  }

  private sendTypingStatus = async (
    isTyping: boolean,
    targetPeerId?: string
  ) => {
    try {
      await this.senders?.typingStatus(
        { isTyping },
        targetPeerId ? { target: targetPeerId } : this.sendOptions()
      )
    } catch (error) {
      this.reportError(error, ChatRoomErrorContext.SEND_TYPING_STATUS)
    }
  }

  private stopTyping = () => {
    this.clearTypingExpiry()

    if (!this.isTyping) return

    this.isTyping = false
    this.updateSelfSnapshot()
    void this.sendTypingStatus(false)
  }

  private clearTypingExpiry = () => {
    if (this.typingExpiryTimer === null) return

    clearTimeout(this.typingExpiryTimer)
    this.typingExpiryTimer = null
  }

  /**
   * Whether an incoming action belongs to this room.
   *
   * Every room on a transport shares that transport's actions, and a
   * direct-message room shares the `dm` namespace with every *other*
   * direct-message room the host has open — so each one has to recognise its
   * own correspondent. Without this, one conversation's transcript, metadata,
   * typing status or file offer lands in another's.
   */
  private isFromRoomPeer = (peerId: string) =>
    !this.isDirectMessageRoom || peerId === this.targetPeerId

  /** Scopes an action to one peer in a direct-message room, or broadcasts. */
  private sendOptions = () =>
    this.targetPeerId ? { target: this.targetPeerId } : undefined

  private appendToMessageLog = (message: Message | InlineMedia) => {
    if (isInlineMedia(message)) {
      this.adapters.fileTransfer.trackInlineMedia(message.magnetURI)
    }

    this.setMessageLog([...this.messageLog, message])
  }

  /** Stamps one of our own messages as delivered once the sends resolve. */
  private markOwnMessageDelivered = (id: string) => {
    this.setMessageLog(
      this.messageLog.map(message =>
        message.id === id && !isMessageReceived(message)
          ? { ...message, timeReceived: this.adapters.clock.now() }
          : message
      )
    )
  }

  private setMessageLog = (messages: MessageLog) => {
    const { messageLog, evicted } = applyTranscriptLimit(
      messages,
      this.transcriptSizeLimit
    )

    this.stopSeedingEvictedMedia(evicted, messageLog)

    this.messageLog = messageLog
    this.messageLogSnapshot = messageLog
    this.emit(ChatRoomEvent.MESSAGE_LOG_CHANGE, { messageLog })
  }

  /**
   * Lets go of the inline media that has scrolled out of the transcript, which
   * is unreachable now, rather than holding its torrent open forever.
   *
   * An entry is a claim about a torrent, not proof this client has anything to
   * do with it: a peer's transcript can name any magnet it has seen, including
   * one for a file this client is offering. So an entry going away ends the
   * seed only when nothing else stands behind it — no entry still in the log,
   * no offer of our own, and no present peer offering it. That is the rule
   * {@link shouldStopSeedingOffer} applies to a withdrawn offer, for the same
   * reason: a magnet is a bearer identifier anyone can write.
   */
  private stopSeedingEvictedMedia = (
    evicted: MessageLog,
    remaining: MessageLog
  ) => {
    // Distinct, so a magnet evicted twice in one batch (an image sent twice) is
    // let go of once. Checked first, as nearly every call evicts nothing.
    const evictedUris = new Set(getInlineMediaUris(evicted))

    if (!evictedUris.size) return

    const stillShown = new Set(getInlineMediaUris(remaining))

    for (const magnetURI of evictedUris) {
      if (stillShown.has(magnetURI)) continue

      this.adapters.fileTransfer.untrackInlineMedia(magnetURI)

      if (this.isStillOffered(magnetURI)) continue

      if (this.adapters.fileTransfer.isOffering(magnetURI)) {
        this.stopSeeding(magnetURI)
      }
    }
  }

  /** Whether this client or a present peer has an offer standing for a magnet. */
  private isStillOffered = (magnetURI: string) =>
    this.getSelfFileOfferMagnetUri() === magnetURI ||
    Object.values(this.fileOffers).some(offer => offer.magnetURI === magnetURI)

  private setPeers = (peers: Peer[]) => {
    this.peers = peers
    this.peersSnapshot = peers
    this.emit(ChatRoomEvent.PEER_LIST_CHANGE, { peers })
  }

  private setIsMessageSending = (isMessageSending: boolean) => {
    if (this.isMessageSending === isMessageSending) return

    this.isMessageSending = isMessageSending
    this.emit(ChatRoomEvent.SENDING_STATE_CHANGE, { isMessageSending })
  }

  private updateSelfSnapshot = () => {
    this.selfSnapshot = {
      userId: this.userId,
      customUsername: this.customUsername,
      isTyping: this.isTyping,
    }
  }

  /**
   * Stops seeding a file, reporting a failure rather than letting it escape.
   *
   * None of the callers have anything left to do with the outcome — the offer
   * or the transcript entry that advertised the file is already gone — but an
   * unhandled rejection is a console warning in a browser and, by default, the
   * end of the process in the Node host this core is built for.
   */
  private stopSeeding = (magnetURI: string) => {
    this.retainedMagnetUris.delete(magnetURI)

    void this.adapters.fileTransfer
      .rescind(magnetURI)
      .catch(error =>
        this.reportError(error, ChatRoomErrorContext.STOP_SEEDING)
      )
  }

  private reportError = (error: unknown, context: ChatRoomErrorContext) => {
    const wrapped = error instanceof Error ? error : new Error(String(error))

    this.adapters.logger.error(`ChatRoom.${context}`, wrapped)
    this.emit(ChatRoomEvent.ERROR, { error: wrapped, context })
  }
}
