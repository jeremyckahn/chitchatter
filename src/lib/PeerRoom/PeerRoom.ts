import {
  joinRoom,
  Room,
  DataPayload,
  ActionProgress,
  ActionReceiver,
  ActionSender,
} from 'trystero/torrent'
import { joinRoom as baseJoinRoom } from 'trystero'

import { sleep } from 'lib/sleep'
import { StreamType } from 'models/chat'
import { PeerAction } from 'models/network'

export enum PeerHookType {
  NEW_PEER = 'NEW_PEER',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SCREEN = 'SCREEN',
  FILE_SHARE = 'FILE_SHARE',
}

export enum PeerStreamType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SCREEN = 'SCREEN',
}

export enum PeerConnectionType {
  DIRECT = 'DIRECT',
  RELAY = 'RELAY',
}

export enum ActionNamespace {
  GROUP = 'g',
  DIRECT_MESSAGE = 'dm',
}

const streamQueueAddDelay = 1000

type PeerRoomAction<T extends DataPayload> = [
  ActionSender<T>,
  ActionReceiver<T>,
  ActionProgress,
  () => void,
]

export type RoomConfig = Parameters<typeof baseJoinRoom>[0]

export class PeerRoom {
  private room: Room

  private roomConfig: RoomConfig

  private peerJoinHandlers: Map<
    PeerHookType,
    Parameters<Room['onPeerJoin']>[0]
  > = new Map()

  private peerLeaveHandlers: Map<
    PeerHookType,
    Parameters<Room['onPeerLeave']>[0]
  > = new Map()

  private peerStreamHandlers: Map<
    PeerStreamType,
    Parameters<Room['onPeerStream']>[0]
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

    this.room.onPeerJoin((...args) => {
      for (const [, peerJoinHandler] of this.peerJoinHandlers) {
        peerJoinHandler(...args)
      }
    })

    this.room.onPeerLeave((...args) => {
      for (const [, peerLeaveHandler] of this.peerLeaveHandlers) {
        peerLeaveHandler(...args)
      }
    })

    this.room.onPeerStream((...args) => {
      for (const [, peerStreamHandler] of this.peerStreamHandlers) {
        peerStreamHandler(...args)
      }
    })
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
    fn: Parameters<Room['onPeerJoin']>[0]
  ) => {
    this.peerJoinHandlers.set(peerHookType, fn)
  }

  onPeerJoinFlush = () => {
    this.peerJoinHandlers = new Map()
  }

  onPeerLeave = (
    peerHookType: PeerHookType,
    fn: Parameters<Room['onPeerLeave']>[0]
  ) => {
    this.peerLeaveHandlers.set(peerHookType, fn)
  }

  onPeerLeaveFlush = () => {
    this.peerLeaveHandlers = new Map()
  }

  onPeerStream = (
    peerStreamType: PeerStreamType,
    fn: Parameters<Room['onPeerStream']>[0]
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

    const [sender, receiver, progress] = this.room.makeAction<T>(actionName)

    const eventName = `peerRoomAction.${namespace}.${peerAction}`
    const eventTarget = new EventTarget()

    type ActionParameters = Parameters<Parameters<ActionReceiver<T>>[0]>
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

    receiver((...args) => {
      const customEvent = new CustomEvent(eventName, {
        detail: args,
      })

      eventTarget.dispatchEvent(customEvent)
    })

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
    targetPeers: Parameters<Room['addStream']>[1],
    metadata: { type: StreamType }
  ) => {
    // New streams need to be added as a delayed queue to prevent race
    // conditions on the receiver's end where streams and their metadata get
    // mixed up.
    this.streamQueue.push(
      () => Promise.all(this.room.addStream(stream, targetPeers, metadata)),
      () => sleep(streamQueueAddDelay)
    )

    this.processPendingStreams()
  }

  removeStream: Room['removeStream'] = (stream, targetPeers) => {
    return this.room.removeStream(stream, targetPeers)
  }
}
