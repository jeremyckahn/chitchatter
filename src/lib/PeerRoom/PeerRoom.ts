import {
  joinRoom,
  Room,
  BaseRoomConfig,
  DataPayload,
  RelayConfig,
} from 'trystero/torrent'

import { sleep } from 'lib/sleep'
import {
  ReceivedInlineMedia,
  ReceivedMessage,
  StreamType,
  TypingStatus,
  UnsentInlineMedia,
  UnsentMessage,
} from 'models/chat'
import { PeerAction } from 'models/network'
import { ActionSender, ActionReceiver, ActionProgress } from 'trystero'

interface UserMetadata extends Record<string, any> {
  userId: string
  customUsername: string
  publicKeyString: string
}

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

const streamQueueAddDelay = 1000

export class PeerRoom {
  private room: Room

  private roomConfig: RelayConfig & BaseRoomConfig

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

  sendPeerMetadata: ActionSender<UserMetadata>
  receivePeerMetadata: ActionReceiver<UserMetadata>
  sendMessageTranscript: ActionSender<
    Array<ReceivedMessage | ReceivedInlineMedia>
  >
  receiveMessageTranscript: ActionReceiver<
    Array<ReceivedMessage | ReceivedInlineMedia>
  >
  sendPeerMessage: ActionSender<UnsentMessage>
  receivePeerMessage: ActionReceiver<UnsentMessage>
  sendPeerInlineMedia: ActionSender<UnsentInlineMedia>
  receivePeerInlineMedia: ActionReceiver<UnsentInlineMedia>
  sendTypingStatusChange: ActionSender<TypingStatus>
  receiveTypingStatusChange: ActionReceiver<TypingStatus>

  constructor(config: RelayConfig & BaseRoomConfig, roomId: string) {
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
    ;[this.sendPeerMetadata, this.receivePeerMetadata] =
      this.makeAction<UserMetadata>(PeerAction.PEER_METADATA)
    ;[this.sendMessageTranscript, this.receiveMessageTranscript] =
      this.makeAction<Array<ReceivedMessage | ReceivedInlineMedia>>(
        PeerAction.MESSAGE_TRANSCRIPT
      )
    ;[this.sendPeerMessage, this.receivePeerMessage] =
      this.makeAction<UnsentMessage>(PeerAction.MESSAGE)
    ;[this.sendPeerInlineMedia, this.receivePeerInlineMedia] =
      this.makeAction<UnsentInlineMedia>(PeerAction.MEDIA_MESSAGE)
    ;[this.sendTypingStatusChange, this.receiveTypingStatusChange] =
      this.makeAction<TypingStatus>(PeerAction.TYPING_STATUS_CHANGE)
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

  // FIXME: This is subscribing duplicate handlers
  makeAction = <T extends DataPayload>(
    peerAction: PeerAction
  ): [ActionSender<T>, ActionReceiver<T>, ActionProgress] => {
    const [sender, receiver, progress] = this.room.makeAction<T>(
      `${peerAction}`
    )

    const eventName = `peerRoomAction.${peerAction}`
    const eventTarget = new EventTarget()

    const dispatchReceiver: ActionReceiver<T> = callback => {
      eventTarget.addEventListener(eventName, event => {
        // @ts-expect-error
        callback(...event.detail)
      })
    }

    receiver((...args) => {
      const customEvent = new CustomEvent(eventName, {
        detail: args,
      })

      eventTarget.dispatchEvent(customEvent)
    })

    return [sender, dispatchReceiver, progress]
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
