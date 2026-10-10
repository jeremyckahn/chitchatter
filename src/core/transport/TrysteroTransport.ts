import {
  joinRoom,
  Room,
  DataPayload,
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

  private actions: Partial<Record<string, PeerRoomAction<any>>> = {}

  constructor(config: RoomConfig, roomId: string) {
    this.roomConfig = config
    this.room = joinRoom(this.roomConfig, roomId)

    this.room.onPeerJoin = (...args) => {
      for (const [, peerJoinHandler] of this.peerJoinHandlers) {
        peerJoinHandler(...args)
      }
    }

    this.room.onPeerLeave = (...args) => {
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
    for (const peerId of alreadyConnected) fn(peerId)
  }

  onPeerJoinFlush = () => {
    this.peerJoinHandlers = new Map()
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

    if (actionName in this.actions) {
      return this.actions[actionName] as PeerRoomAction<T>
    }

    const actionObj = this.room.makeAction<T>(actionName)

    const sender: ActionSender<T> = (data, options) => {
      return actionObj.send(data, options)
    }

    const progress: ActionProgress = fn => {
      actionObj.onReceiveProgress = fn
    }

    const eventName = `peerRoomAction.${namespace}.${peerAction}`
    const eventTarget = new EventTarget()

    type ActionParameters = [T, MessageContext]
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

    actionObj.onMessage = (data, context) => {
      const customEvent = new CustomEvent(eventName, {
        detail: [data, context],
      })

      eventTarget.dispatchEvent(customEvent)
    }

    const detatchDispatchReceiver = () => {
      eventTarget.removeEventListener(eventName, handler)
    }

    const action: PeerRoomAction<T> = [
      sender,
      connectReceiver,
      progress,
      detatchDispatchReceiver,
    ]

    this.actions[actionName] = action

    return action
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
