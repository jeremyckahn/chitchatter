import { sleep } from 'lib/sleep'
import { StreamType } from 'models/chat'
import { PeerAction } from 'models/network'

import {
  ActionProgress,
  ActionReceiver,
  ActionSender,
  DataChannelMessage,
  DataPayload,
  RoomConfig,
  SignalingIncomingMessage,
} from './types'

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

export type { RoomConfig }

const streamQueueAddDelay = 1000
const DATA_CHANNEL_NAME = 'chitchatter'
const WS_RECONNECT_BASE_DELAY = 1000
const WS_RECONNECT_MAX_DELAY = 30000

type PeerRoomAction<T extends DataPayload> = [
  ActionSender<T>,
  ActionReceiver<T>,
  ActionProgress,
  () => void,
]

export class PeerRoom {
  private ws: WebSocket | null = null

  private localPeerId = ''

  private peers: Map<string, RTCPeerConnection> = new Map()

  private dataChannels: Map<string, RTCDataChannel> = new Map()

  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map()

  private pendingStreamMetadata: Map<string, { type: StreamType }> = new Map()

  private peerJoinHandlers: Map<PeerHookType, (peerId: string) => void> =
    new Map()

  private peerLeaveHandlers: Map<PeerHookType, (peerId: string) => void> =
    new Map()

  private peerStreamHandlers: Map<
    PeerStreamType,
    (
      stream: MediaStream,
      peerId: string,
      metadata: { type: StreamType }
    ) => void
  > = new Map()

  private streamQueue: (() => Promise<unknown>)[] = []

  private isProcessingPendingStreams = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private actions: Partial<Record<string, PeerRoomAction<any>>> = {}

  private actionHandlers: Map<string, (data: unknown, peerId: string) => void> =
    new Map()

  private roomConfig: RoomConfig

  private roomId: string

  private signalingRoomId = ''

  private wsReconnectAttempts = 0

  private isLeaving = false

  private localStreams: Map<
    string,
    { stream: MediaStream; metadata: { type: StreamType } }
  > = new Map()

  constructor(config: RoomConfig, roomId: string) {
    this.roomConfig = config
    this.roomId = roomId
    this.initSignaling()
  }

  private initSignaling = async () => {
    this.signalingRoomId = await this.deriveRoomId()
    this.connectWebSocket()
  }

  private deriveRoomId = async (): Promise<string> => {
    const input = `${this.roomConfig.appId || ''}:${this.roomId}:${this.roomConfig.password || ''}`
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(input)
    )
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private connectWebSocket = () => {
    if (this.isLeaving) return

    const wsUrl = `${this.roomConfig.signalingServerUrl}/room/${this.signalingRoomId}`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.wsReconnectAttempts = 0
    }

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      try {
        const msg = JSON.parse(event.data) as SignalingIncomingMessage
        this.handleSignalingMessage(msg)
      } catch {
        // Ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      if (!this.isLeaving) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect = () => {
    const delay = Math.min(
      WS_RECONNECT_BASE_DELAY * Math.pow(2, this.wsReconnectAttempts),
      WS_RECONNECT_MAX_DELAY
    )
    this.wsReconnectAttempts++
    setTimeout(() => this.connectWebSocket(), delay)
  }

  private sendSignaling = (data: Record<string, unknown>) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private handleSignalingMessage = (msg: SignalingIncomingMessage) => {
    switch (msg.type) {
      case 'init':
        this.localPeerId = msg.peerId
        for (const peerId of msg.peerIds) {
          this.createPeerConnection(peerId, true)
        }
        break

      case 'peer-joined':
        if (this.localPeerId > msg.peerId) {
          this.createPeerConnection(msg.peerId, true)
        }
        break

      case 'peer-left':
        this.removePeer(msg.peerId)
        break

      case 'offer':
        this.handleRemoteOffer(msg.fromPeerId, msg.sdp)
        break

      case 'answer':
        this.handleRemoteAnswer(msg.fromPeerId, msg.sdp)
        break

      case 'ice-candidate':
        this.handleRemoteIceCandidate(msg.fromPeerId, msg.candidate)
        break
    }
  }

  private createPeerConnection = (
    peerId: string,
    initiator: boolean
  ): RTCPeerConnection => {
    if (this.peers.has(peerId)) {
      this.peers.get(peerId)!.close()
      this.peers.delete(peerId)
      this.dataChannels.delete(peerId)
    }

    const pc = new RTCPeerConnection(this.roomConfig.rtcConfig)
    this.peers.set(peerId, pc)

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'ice-candidate',
          targetPeerId: peerId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed'
      ) {
        this.removePeer(peerId)
      }
    }

    pc.ontrack = (event: RTCTrackEvent) => {
      const stream = event.streams[0]
      if (!stream) return

      const metadata = this.pendingStreamMetadata.get(stream.id) || {
        type: StreamType.WEBCAM,
      }
      this.pendingStreamMetadata.delete(stream.id)

      for (const handler of this.peerStreamHandlers.values()) {
        handler(stream, peerId, metadata)
      }
    }

    pc.ondatachannel = (event: RTCDataChannelEvent) => {
      this.setupDataChannel(event.channel, peerId)
    }

    for (const [, { stream }] of this.localStreams) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream)
      }
    }

    if (initiator) {
      const dc = pc.createDataChannel(DATA_CHANNEL_NAME, { ordered: true })
      this.setupDataChannel(dc, peerId)
      this.createAndSendOffer(pc, peerId)
    }

    return pc
  }

  private setupDataChannel = (dc: RTCDataChannel, peerId: string) => {
    dc.onopen = () => {
      this.dataChannels.set(peerId, dc)
      this.notifyPeerJoin(peerId)
    }

    dc.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      try {
        const msg = JSON.parse(event.data) as DataChannelMessage
        this.handleDataChannelMessage(peerId, msg)
      } catch {
        // Ignore malformed messages
      }
    }

    dc.onclose = () => {
      const hadChannel = this.dataChannels.has(peerId)
      this.dataChannels.delete(peerId)
      if (hadChannel) {
        this.removePeer(peerId)
      }
    }
  }

  private handleDataChannelMessage = (
    peerId: string,
    msg: DataChannelMessage
  ) => {
    if (msg.action === '__stream_metadata__') {
      const { streamId, metadata } = msg.data as {
        streamId: string
        metadata: { type: StreamType }
      }
      this.pendingStreamMetadata.set(streamId, metadata)
      return
    }

    const handler = this.actionHandlers.get(msg.action)
    if (handler) {
      handler(msg.data, peerId)
    }
  }

  private createAndSendOffer = async (
    pc: RTCPeerConnection,
    peerId: string
  ) => {
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      this.sendSignaling({
        type: 'offer',
        targetPeerId: peerId,
        sdp: pc.localDescription!.toJSON(),
      })
    } catch (e) {
      console.error('Failed to create offer:', e)
    }
  }

  private handleRemoteOffer = async (
    fromPeerId: string,
    sdp: RTCSessionDescriptionInit
  ) => {
    let pc = this.peers.get(fromPeerId)
    if (!pc) {
      pc = this.createPeerConnection(fromPeerId, false)
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      this.flushPendingIceCandidates(fromPeerId)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      this.sendSignaling({
        type: 'answer',
        targetPeerId: fromPeerId,
        sdp: pc.localDescription!.toJSON(),
      })
    } catch (e) {
      console.error('Failed to handle offer:', e)
    }
  }

  private handleRemoteAnswer = async (
    fromPeerId: string,
    sdp: RTCSessionDescriptionInit
  ) => {
    const pc = this.peers.get(fromPeerId)
    if (!pc) return

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      this.flushPendingIceCandidates(fromPeerId)
    } catch (e) {
      console.error('Failed to handle answer:', e)
    }
  }

  private handleRemoteIceCandidate = async (
    fromPeerId: string,
    candidate: RTCIceCandidateInit
  ) => {
    const pc = this.peers.get(fromPeerId)
    if (!pc || !pc.remoteDescription) {
      const pending = this.pendingIceCandidates.get(fromPeerId) || []
      pending.push(candidate)
      this.pendingIceCandidates.set(fromPeerId, pending)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (e) {
      console.error('Failed to add ICE candidate:', e)
    }
  }

  private flushPendingIceCandidates = (peerId: string) => {
    const pending = this.pendingIceCandidates.get(peerId)
    if (!pending) return

    const pc = this.peers.get(peerId)
    if (!pc) return

    for (const candidate of pending) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
    }
    this.pendingIceCandidates.delete(peerId)
  }

  private notifyPeerJoin = (peerId: string) => {
    for (const handler of this.peerJoinHandlers.values()) {
      handler(peerId)
    }
  }

  private notifyPeerLeave = (peerId: string) => {
    for (const handler of this.peerLeaveHandlers.values()) {
      handler(peerId)
    }
  }

  private removePeer = (peerId: string) => {
    const pc = this.peers.get(peerId)
    if (pc) {
      pc.close()
      this.peers.delete(peerId)
    }
    this.dataChannels.delete(peerId)
    this.pendingIceCandidates.delete(peerId)
    this.notifyPeerLeave(peerId)
  }

  private processPendingStreams = async () => {
    if (this.isProcessingPendingStreams) return

    this.isProcessingPendingStreams = true

    while (this.streamQueue.length > 0) {
      await this.streamQueue.shift()?.()
    }

    this.isProcessingPendingStreams = false
  }

  private sendToDataChannel = (
    peerId: string,
    message: DataChannelMessage
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const dc = this.dataChannels.get(peerId)
      if (!dc || dc.readyState !== 'open') {
        reject(new Error(`No open data channel for peer ${peerId}`))
        return
      }

      try {
        dc.send(JSON.stringify(message))
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }

  flush = () => {
    this.onPeerJoinFlush()
    this.onPeerLeaveFlush()
    this.onPeerStreamFlush()
  }

  leaveRoom = () => {
    this.isLeaving = true

    for (const [, pc] of this.peers) {
      pc.close()
    }
    this.peers.clear()
    this.dataChannels.clear()
    this.pendingIceCandidates.clear()

    this.ws?.close()
    this.ws = null

    this.flush()
  }

  onPeerJoin = (peerHookType: PeerHookType, fn: (peerId: string) => void) => {
    this.peerJoinHandlers.set(peerHookType, fn)
  }

  onPeerJoinFlush = () => {
    this.peerJoinHandlers = new Map()
  }

  onPeerLeave = (peerHookType: PeerHookType, fn: (peerId: string) => void) => {
    this.peerLeaveHandlers.set(peerHookType, fn)
  }

  onPeerLeaveFlush = () => {
    this.peerLeaveHandlers = new Map()
  }

  onPeerStream = (
    peerStreamType: PeerStreamType,
    fn: (
      stream: MediaStream,
      peerId: string,
      metadata: { type: StreamType }
    ) => void
  ) => {
    this.peerStreamHandlers.set(peerStreamType, fn)
  }

  onPeerStreamFlush = () => {
    this.peerStreamHandlers = new Map()
  }

  getPeers = (): string[] => {
    return Array.from(this.dataChannels.keys())
  }

  getPeerConnections = (): Record<string, RTCPeerConnection> => {
    const result: Record<string, RTCPeerConnection> = {}
    for (const [peerId, pc] of this.peers) {
      if (this.dataChannels.has(peerId)) {
        result[peerId] = pc
      }
    }
    return result
  }

  getPeerConnectionTypes = async (): Promise<
    Record<string, PeerConnectionType>
  > => {
    const peerConnections: Record<string, PeerConnectionType> = {}

    await Promise.all(
      Array.from(this.peers.entries())
        .filter(([peerId]) => this.dataChannels.has(peerId))
        .map(async ([peerId, pc]) => {
          const stats = await pc.getStats()
          let selectedLocalCandidate: string | undefined

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

    const sender: ActionSender<T> = (
      data: T,
      targetPeers?: string | string[] | null
    ): Promise<void>[] => {
      const message: DataChannelMessage = {
        action: actionName,
        data,
      }

      if (targetPeers === null || targetPeers === undefined) {
        return Array.from(this.dataChannels.keys()).map(peerId =>
          this.sendToDataChannel(peerId, message)
        )
      }

      const targets = Array.isArray(targetPeers) ? targetPeers : [targetPeers]

      return targets.map(peerId => this.sendToDataChannel(peerId, message))
    }

    const eventName = `peerRoomAction.${namespace}.${peerAction}`
    const eventTarget = new EventTarget()

    type ActionParameters = [T, string]
    let handler: ((event: CustomEventInit<ActionParameters>) => void) | null =
      null

    const connectReceiver: ActionReceiver<T> = callback => {
      handler = (event: CustomEventInit<ActionParameters>) => {
        const { detail } = event
        if (!detail) {
          throw new TypeError('Invalid receiver arguments')
        }
        callback(detail[0], detail[1])
      }
      eventTarget.addEventListener(eventName, handler)
    }

    this.actionHandlers.set(actionName, (data: unknown, peerId: string) => {
      const customEvent = new CustomEvent(eventName, {
        detail: [data as T, peerId] as ActionParameters,
      })
      eventTarget.dispatchEvent(customEvent)
    })

    const progress: ActionProgress = () => {
      // Progress tracking is not needed for small JSON messages.
      // File transfer uses a separate WebTorrent-based mechanism.
    }

    const detachReceiver = () => {
      if (handler) {
        eventTarget.removeEventListener(eventName, handler)
        handler = null
      }
    }

    const action: PeerRoomAction<T> = [
      sender,
      connectReceiver,
      progress,
      detachReceiver,
    ]

    this.actions[actionName] = action

    return action
  }

  addStream = (
    stream: MediaStream,
    targetPeers: string | string[] | null | undefined,
    metadata: { type: StreamType }
  ) => {
    this.localStreams.set(stream.id, { stream, metadata })

    this.streamQueue.push(
      () => {
        const resolvedPeers = targetPeers
          ? Array.isArray(targetPeers)
            ? targetPeers
            : [targetPeers]
          : Array.from(this.peers.keys())
        const peers = resolvedPeers
        const promises: Promise<void>[] = []

        for (const peerId of peers) {
          const dc = this.dataChannels.get(peerId)
          if (dc && dc.readyState === 'open') {
            dc.send(
              JSON.stringify({
                action: '__stream_metadata__',
                data: { streamId: stream.id, metadata },
              })
            )
          }

          const pc = this.peers.get(peerId)
          if (pc) {
            for (const track of stream.getTracks()) {
              pc.addTrack(track, stream)
            }

            promises.push(this.renegotiate(pc, peerId))
          }
        }

        return Promise.all(promises)
      },
      () => sleep(streamQueueAddDelay)
    )

    this.processPendingStreams()
  }

  removeStream = (stream: MediaStream, targetPeers?: string | string[]) => {
    this.localStreams.delete(stream.id)

    const peers = targetPeers
      ? Array.isArray(targetPeers)
        ? targetPeers
        : [targetPeers]
      : Array.from(this.peers.keys())

    for (const peerId of peers) {
      const pc = this.peers.get(peerId)
      if (!pc) continue

      const senders = pc.getSenders()
      for (const track of stream.getTracks()) {
        const sender = senders.find(s => s.track === track)
        if (sender) {
          pc.removeTrack(sender)
        }
      }

      this.renegotiate(pc, peerId)
    }
  }

  private renegotiate = async (
    pc: RTCPeerConnection,
    peerId: string
  ): Promise<void> => {
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      this.sendSignaling({
        type: 'offer',
        targetPeerId: peerId,
        sdp: pc.localDescription!.toJSON(),
      })
    } catch (e) {
      console.error('Failed to renegotiate:', e)
    }
  }

  getSignalingState = (): 'connected' | 'connecting' | 'disconnected' => {
    if (!this.ws) return 'disconnected'
    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CONNECTING:
        return 'connecting'
      default:
        return 'disconnected'
    }
  }
}
