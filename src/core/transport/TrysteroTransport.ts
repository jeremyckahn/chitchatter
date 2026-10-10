import {
  joinRoom,
  Room,
  DataPayload,
  MessageAction,
  MessageContext,
} from '@trystero-p2p/torrent'
import { joinRoom as baseJoinRoom } from 'trystero'

import { sleep } from 'core/lib/sleep'
import { PeerAction } from 'core/models/network'
import {
  ActionProgress,
  ActionReceiver,
  ActionSender,
  PeerConnectionType,
  PeerHookType,
  PeerRoomAction,
  PeerStreamType,
  PeerTransport,
} from 'core/transport/types'

const streamQueueAddDelay = 1000

export type RoomConfig = Parameters<typeof baseJoinRoom>[0]

/**
 * Trystero allows one action per name for the lifetime of the room, so the
 * action and the dispatcher that fans its messages out are shared by every
 * caller asking for that name. The receiver handles are not — see
 * {@link TrysteroTransport.makeAction}.
 */
interface SharedAction {
  actionObj: MessageAction<any>
  eventTarget: EventTarget
}

export class TrysteroTransport implements PeerTransport {
  private room: Room

  private roomConfig: RoomConfig

  private peerJoinHandlers: Map<
    PeerHookType,
    Exclude<Room['onPeerJoin'], null>
  > = new Map()

  private peerLeaveHandlers: Map<
    PeerHookType,
    Exclude<Room['onPeerLeave'], null>
  > = new Map()

  private peerStreamHandlers: Map<
    PeerStreamType,
    Exclude<Room['onPeerStream'], null>
  > = new Map()

  /**
   * Which peers each join-hook type has already been told about.
   *
   * Handlers register after the room is joined — `ChatRoom` in `join()`, the
   * media hooks during render — so each one has to be given the peers that
   * connected before it existed. Recording what a hook type has already seen is
   * what keeps a re-registration from re-announcing them: the media hooks
   * re-register on every render, and re-announcing a peer there re-queues its
   * media streams.
   */
  private announcedJoins: Map<PeerHookType, Set<string>> = new Map()

  private streamQueue: (() => Promise<any>)[] = []

  private isProcessingPendingStreams = false

  private processPendingStreams = async () => {
    if (this.isProcessingPendingStreams) return

    this.isProcessingPendingStreams = true

    while (this.streamQueue.length > 0) {
      await this.streamQueue.shift()?.()
    }

    this.isProcessingPendingStreams = false
  }

  private actions: Partial<Record<string, SharedAction>> = {}

  constructor(config: RoomConfig, roomId: string) {
    this.roomConfig = config
    this.room = joinRoom(this.roomConfig, roomId)

    this.room.onPeerJoin = (...args) => {
      const [peerId] = args

      for (const [peerHookType, peerJoinHandler] of this.peerJoinHandlers) {
        this.markJoinAnnounced(peerHookType, peerId)
        peerJoinHandler(...args)
      }
    }

    this.room.onPeerLeave = (...args) => {
      const [peerId] = args

      // Forgotten on the way out, so that a peer which comes back is announced
      // again rather than treated as one we have already greeted.
      for (const announced of this.announcedJoins.values()) {
        announced.delete(peerId)
      }

      for (const [, peerLeaveHandler] of this.peerLeaveHandlers) {
        peerLeaveHandler(...args)
      }
    }

    this.room.onPeerStream = (...args) => {
      for (const [, peerStreamHandler] of this.peerStreamHandlers) {
        peerStreamHandler(...args)
      }
    }
  }

  flush = () => {
    this.onPeerJoinFlush()
    this.onPeerLeaveFlush()
    this.onPeerStreamFlush()
  }

  leaveRoom = () => {
    this.room.leave()
    this.flush()
  }

  onPeerJoin = (
    peerHookType: PeerHookType,
    fn: Exclude<Room['onPeerJoin'], null>
  ) => {
    const alreadyConnected = this.getPeers()

    this.peerJoinHandlers.set(peerHookType, fn)

    // The room is joined in this class's constructor, but handlers register
    // later — ChatRoom registers its own in join(), and the media hooks later
    // still. Without this replay a peer that connects in between fires into an
    // empty handler map and is never announced to anyone, which costs the peer
    // its metadata exchange and the newcomer its transcript backfill.
    for (const peerId of alreadyConnected) {
      if (this.announcedJoins.get(peerHookType)?.has(peerId)) continue

      this.markJoinAnnounced(peerHookType, peerId)
      fn(peerId)
    }
  }

  private markJoinAnnounced = (peerHookType: PeerHookType, peerId: string) => {
    const announced = this.announcedJoins.get(peerHookType) ?? new Set<string>()

    announced.add(peerId)
    this.announcedJoins.set(peerHookType, announced)
  }

  onPeerJoinFlush = () => {
    this.peerJoinHandlers = new Map()
    this.announcedJoins = new Map()
  }

  onPeerLeave = (
    peerHookType: PeerHookType,
    fn: Exclude<Room['onPeerLeave'], null>
  ) => {
    this.peerLeaveHandlers.set(peerHookType, fn)
  }

  onPeerLeaveFlush = () => {
    this.peerLeaveHandlers = new Map()
  }

  onPeerStream = (
    peerStreamType: PeerStreamType,
    fn: Exclude<Room['onPeerStream'], null>
  ) => {
    this.peerStreamHandlers.set(peerStreamType, fn)
  }

  onPeerStreamFlush = () => {
    this.peerStreamHandlers = new Map()
  }

  getPeers = () => {
    const peers = this.room.getPeers()

    return Object.keys(peers)
  }

  getPeerConnectionTypes = async () => {
    const peers = this.room.getPeers()

    const peerConnections: Record<string, PeerConnectionType> = {}

    await Promise.all(
      Object.entries(peers).map(async ([peerId, rtcPeerConnection]) => {
        const stats = await rtcPeerConnection.getStats()
        let selectedLocalCandidate

        // https://stackoverflow.com/a/61571171/470685
        for (const { type, state, localCandidateId } of stats.values())
          if (
            type === 'candidate-pair' &&
            state === 'succeeded' &&
            localCandidateId
          ) {
            selectedLocalCandidate = localCandidateId
            break
          }

        const isRelay =
          !!selectedLocalCandidate &&
          stats.get(selectedLocalCandidate)?.candidateType === 'relay'

        peerConnections[peerId] = isRelay
          ? PeerConnectionType.RELAY
          : PeerConnectionType.DIRECT
      })
    )

    return peerConnections
  }

  makeAction = <T extends DataPayload>(
    peerAction: PeerAction,
    namespace: string
  ): PeerRoomAction<T> => {
    const actionName = `${namespace}.${peerAction}`
    const eventName = `peerRoomAction.${actionName}`

    const shared =
      this.actions[actionName] ??
      this.makeSharedAction<T>(actionName, eventName)

    const actionObj = shared.actionObj as MessageAction<T>
    const { eventTarget } = shared

    const sender: ActionSender<T> = (data, options) => {
      return actionObj.send(data, options)
    }

    const progress: ActionProgress = fn => {
      actionObj.onReceiveProgress = fn
    }

    type ActionParameters = [T, MessageContext]

    // Each caller gets its own handle on the shared dispatcher. One namespace
    // can carry several rooms — a host keeps a direct-message room per peer —
    // and a single shared handle would let one room's disconnect detach
    // another room's receiver.
    let handler: ((event: CustomEventInit<ActionParameters>) => void) | null =
      null

    const connectReceiver: ActionReceiver<T> = callback => {
      handler = (event: CustomEventInit<ActionParameters>) => {
        const { detail: receiverArguments } = event

        if (typeof receiverArguments === 'undefined') {
          throw new TypeError('Invalid receiver arguments')
        }

        callback(...receiverArguments)
      }

      eventTarget.addEventListener(eventName, handler)
    }

    const detatchDispatchReceiver = () => {
      if (!handler) return

      eventTarget.removeEventListener(eventName, handler)
      handler = null
    }

    return [sender, connectReceiver, progress, detatchDispatchReceiver]
  }

  private makeSharedAction = <T extends DataPayload>(
    actionName: string,
    eventName: string
  ): SharedAction => {
    const actionObj = this.room.makeAction<T>(actionName)
    const eventTarget = new EventTarget()

    actionObj.onMessage = (data, context) => {
      eventTarget.dispatchEvent(
        new CustomEvent(eventName, { detail: [data, context] })
      )
    }

    const shared: SharedAction = { actionObj, eventTarget }

    this.actions[actionName] = shared

    return shared
  }

  addStream = (
    stream: Parameters<Room['addStream']>[0],
    options?: Parameters<Room['addStream']>[1]
  ) => {
    // New streams need to be added as a delayed queue to prevent race
    // conditions on the receiver's end where streams and their metadata get
    // mixed up.
    this.streamQueue.push(
      () => Promise.all(this.room.addStream(stream, options)),
      () => sleep(streamQueueAddDelay)
    )

    this.processPendingStreams()
  }

  removeStream: Room['removeStream'] = (stream, options) => {
    return this.room.removeStream(stream, options)
  }
}
