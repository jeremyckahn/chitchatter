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
  isEveryFileInlineMedia,
  removeFileOffer,
  shouldRescindOffer,
} from 'core/chat/fileOffers'
import { signIdentity, verifyPeerIdentity } from 'core/chat/identity'
import {
  applyPeerUpdate,
  findPeer,
  PeerStateUpdate,
  reconcilePeerMetadata,
  removePeer,
} from 'core/chat/peers'
import { UserMetadata } from 'core/chat/protocol'
import { applyTranscriptLimit } from 'core/chat/transcript'
import {
  messageTranscriptSizeLimit,
  typingStatusExpiry,
} from 'core/config/messaging'
import { EncryptionService, encryption } from 'core/crypto/Encryption'
import {
  FileOfferMetadata,
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
}

export interface SelfState {
  userId: string
  customUsername: string
  isTyping: boolean
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

  private customUsername: string

  private messageLog: MessageLog = []

  private peers: Peer[] = []

  private fileOffers: FileOffers = {}

  private isMessageSending = false

  private isTyping = false

  private typingExpiryTimer: ReturnType<typeof setTimeout> | null = null

  private selfFileOfferMagnetUri: string | null = null

  private selfOfferedFiles: readonly FileHandle[] | null = null

  private hasJoined = false

  private hasLeft = false

  /**
   * Peers known to have left. Verification is asynchronous, so metadata can
   * still be in flight when its sender goes; without this the peer is
   * resurrected into the list as a ghost that never leaves again.
   */
  private departedPeerIds: Set<string> = new Set()

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
      typingStatus: sendTypingStatus,
      fileOffer: sendFileOffer,
    }

    connectMessage(this.handleMessage)
    connectInlineMedia(this.handleInlineMedia)
    connectTranscript(this.handleTranscript)
    connectMetadata(this.handleMetadata)
    connectTypingStatus(this.handleTypingStatus)
    connectFileOffer(this.handleFileOffer)

    this.disconnectReceivers = [
      disconnectMessage,
      disconnectInlineMedia,
      disconnectTranscript,
      disconnectMetadata,
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

  getSelfFileOfferMagnetUri = () => this.selfFileOfferMagnetUri

  /**
   * The one place our own offer is recorded, so that every change announces
   * itself. A host's stop-sharing control reads
   * {@link getSelfFileOfferMagnetUri} on this event; writing the field
   * directly would leave it showing a share that no longer exists, or none
   * where one does.
   */
  private setSelfFileOffer = (
    magnetURI: string | null,
    files: readonly FileHandle[] | null
  ) => {
    const hasChanged = this.selfFileOfferMagnetUri !== magnetURI

    this.selfFileOfferMagnetUri = magnetURI
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
      const magnetURI = await this.adapters.fileTransfer.offer(
        files,
        this.roomId
      )

      const unsentInlineMedia: UnsentInlineMedia = {
        authorId: this.userId,
        magnetURI,
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

    const magnetURI = await this.adapters.fileTransfer.offer(files, this.roomId)

    this.setSelfFileOffer(magnetURI, files)

    try {
      await this.senders?.fileOffer(
        { magnetURI, isAllInlineMedia: isEveryFileInlineMedia(files) },
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
    const magnetURI = this.selfFileOfferMagnetUri

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
    message: UnsentMessage,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const received: ReceivedMessage = {
      ...message,
      timeReceived: this.adapters.clock.now(),
    }

    this.appendToMessageLog(received)
    this.updatePeer(peerId, { isTypingGroupMessage: false })
    this.emit(ChatRoomEvent.MESSAGE_RECEIVED, { message: received, peerId })
  }

  private handleInlineMedia = (
    inlineMedia: UnsentInlineMedia,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const received: ReceivedInlineMedia = {
      ...inlineMedia,
      timeReceived: this.adapters.clock.now(),
    }

    this.appendToMessageLog(received)
    this.emit(ChatRoomEvent.MESSAGE_RECEIVED, { message: received, peerId })
  }

  private handleTranscript = (
    transcript: Array<ReceivedMessage | ReceivedInlineMedia>,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    // A transcript only backfills an empty log; it never overwrites messages
    // this peer already has.
    if (this.messageLog.length) return

    this.setMessageLog(transcript)
  }

  private handleMetadata = async (
    {
      userId,
      customUsername,
      publicKeyString,
      identitySignatureBase64,
    }: UserMetadata,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    const verified = await verifyPeerIdentity({
      encryptionService: this.encryptionService,
      publicKeyString,
      identitySignatureBase64,
      roomId: this.roomId,
      peerUserId: userId,
    })

    if (!verified) {
      this.adapters.logger.warn(
        `Could not parse the public key advertised by peer ${peerId}; ignoring its metadata`
      )

      return
    }

    if (verified.verificationState === PeerVerificationState.UNVERIFIED) {
      this.adapters.logger.warn(
        'Peer verification failed, marking peer as unverified'
      )
    }

    // Deliberately not `transport.getPeers().includes(peerId)`: that couples
    // correctness to transport timing and drops metadata from a live peer whose
    // connection has not yet surfaced in the transport's peer list.
    if (this.hasLeft || this.departedPeerIds.has(peerId)) return

    // Resolved from the peer this metadata belongs to, found by `peerId`. The
    // incoming `userId` is the *new* identity, so looking the previous name up
    // by it reports a name the user has never seen — `Breezy Bear is now Alice
    // (Breezy Bear)` — whenever a settings import changes the user id.
    const previousPeer = findPeer(this.peers, peerId)

    const { peers, addedPeer, rename } = reconcilePeerMetadata(this.peers, {
      peerId,
      userId,
      customUsername,
      publicKey: verified.publicKey,
      verificationState: verified.verificationState,
    })

    this.setPeers(peers)

    this.emit(ChatRoomEvent.PEER_VERIFICATION, {
      peerId,
      verificationState: verified.verificationState,
    })

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
        displayName: getDisplayUsername(userId, {
          selfUserId: this.userId,
          selfCustomUsername: this.customUsername,
          peers,
        }),
      })
    }
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
    metadata: FileOfferMetadata | null,
    { peerId }: { peerId: string }
  ) => {
    if (!this.isFromRoomPeer(peerId)) return

    if (metadata) {
      this.fileOffers = applyFileOffer(this.fileOffers, peerId, metadata)
    } else {
      const withdrawn = this.fileOffers[peerId]

      if (
        shouldRescindOffer(withdrawn, this.adapters.fileTransfer.isOffering)
      ) {
        this.stopSeeding(withdrawn.magnetURI)
      }

      this.fileOffers = removeFileOffer(this.fileOffers, peerId)
    }

    this.updatePeer(peerId, { offeredFileId: metadata?.magnetURI ?? null })
    this.emit(ChatRoomEvent.FILE_OFFER_CHANGE, { peerId, metadata })
  }

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
      // Sent concurrently: signing the identity proof is slow enough that
      // awaiting it first would delay the newcomer's transcript.
      await Promise.all([
        this.announceSelf(peerId),

        // Public rooms backfill history for newcomers. Private rooms do not:
        // joining with the password should not hand over what was said before.
        // Neither do direct-message rooms, whose history belongs to the two
        // people in it and is already on both sides.
        this.isPrivate || this.isDirectMessageRoom
          ? Promise.resolve()
          : this.senders?.transcript(
              this.messageLog.filter(isMessageReceived),
              { target: peerId }
            ),

        this.selfFileOfferMagnetUri
          ? this.senders?.fileOffer(
              {
                magnetURI: this.selfFileOfferMagnetUri,
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

    const peer = findPeer(this.peers, peerId)
    const offer = this.fileOffers[peerId]

    if (shouldRescindOffer(offer, this.adapters.fileTransfer.isOffering)) {
      this.stopSeeding(offer.magnetURI)
    }

    // Announced like any other change to the offer snapshot: subscribers re-read
    // it on this event and nothing else, so dropping the offer silently would
    // leave them holding a departed peer's.
    if (offer) {
      this.fileOffers = removeFileOffer(this.fileOffers, peerId)
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

  private announceSelf = async (targetPeerId?: string) => {
    if (!this.senders) return

    try {
      const proof = await signIdentity({
        encryptionService: this.encryptionService,
        publicKey: this.publicKey,
        privateKey: this.privateKey,
        roomId: this.roomId,
        userId: this.userId,
      })

      await this.senders.metadata(
        {
          userId: this.userId,
          customUsername: this.customUsername,
          ...proof,
        },
        targetPeerId ? { target: targetPeerId } : this.sendOptions()
      )
    } catch (error) {
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

    // Inline media that has scrolled out of the transcript is unreachable, so
    // stop seeding it rather than holding the torrent open forever.
    for (const message of evicted) {
      if (
        isInlineMedia(message) &&
        this.adapters.fileTransfer.isOffering(message.magnetURI)
      ) {
        this.stopSeeding(message.magnetURI)
      }
    }

    this.messageLog = messageLog
    this.messageLogSnapshot = messageLog
    this.emit(ChatRoomEvent.MESSAGE_LOG_CHANGE, { messageLog })
  }

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
