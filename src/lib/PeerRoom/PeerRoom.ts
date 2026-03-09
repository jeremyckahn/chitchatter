import { sleep } from 'lib/sleep'
import { SfuClient } from 'lib/SfuClient'
import type { SfuTrackInfo } from 'lib/SfuClient'
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

  private sfuClient: SfuClient | null = null

  private sfuSessionReady = false

  private sfuTrackNames: Map<string, string> = new Map()

  private sfuEnabled = false

  constructor(config: RoomConfig, roomId: string) {
    this.roomConfig = config
    this.roomId = roomId
    this.initSignaling()
  }

  initSfuIfAvailable = async (sfuAvailable: boolean) => {
    if (!sfuAvailable || !this.roomConfig.sfuApiBase) return

    this.sfuEnabled = true
    this.sfuClient = new SfuClient(this.roomConfig.sfuApiBase)

    try {
      await this.sfuClient.createSession(this.roomConfig.rtcConfig)
      this.sfuSessionReady = true

      this.sfuClient.onRemoteTrack(
        (
          _track: MediaStreamTrack,
          stream: MediaStream,
          peerId: string,
          streamType: StreamType
        ) => {
          const metadata = { type: streamType }
          for (const handler of this.peerStreamHandlers.values()) {
            handler(stream, peerId, metadata)
          }
        }
      )
    } catch (e) {
      console.error('SFU not available, using P2P for media:', e)
      this.sfuEnabled = false
      this.sfuSessionReady = false
      this.sfuClient?.destroy()
      this.sfuClient = null
    }
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
        // Only initiate if we don't already have a connection to this peer.
        // The new peer will initiate to us from their 'init' handler.
        // We only create as a fallback if the new peer's ID is lower (tiebreaker).
        if (!this.peers.has(msg.peerId) && this.localPeerId > msg.peerId) {
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
    const existingPc = this.peers.get(peerId)
    if (existingPc) {
      // Don't destroy a connection that's already connected or connecting
      if (
        existingPc.connectionState === 'connected' ||
        existingPc.connectionState === 'connecting' ||
        existingPc.iceConnectionState === 'connected' ||
        existingPc.iceConnectionState === 'checking'
      ) {
        return existingPc
      }
      existingPc.close()
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
      if (pc.iceConnectionState === 'failed') {
        this.removePeer(peerId)
      }
      // 'disconnected' is often temporary (network change, sleep).
      // Only remove after a timeout if it doesn't recover.
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          if (
            this.peers.get(peerId) === pc &&
            pc.iceConnectionState === 'disconnected'
          ) {
            this.removePeer(peerId)
          }
        }, 10000)
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

    if (msg.action === '__sfu_track_published__') {
      const info = msg.data as {
        trackName: string
        sessionId: string
        streamType: StreamType
      }
      this.handleSfuTrackPublished(peerId, info)
      return
    }

    const handler = this.actionHandlers.get(msg.action)
    if (handler) {
      handler(this.decodeDataFromTransport(msg.data), peerId)
    }
  }

  private handleSfuTrackPublished = async (
    _peerId: string,
    info: {
      trackName: string
      sessionId: string
      streamType: StreamType
    }
  ) => {
    if (!this.sfuClient || !this.sfuSessionReady) return

    const trackInfo: SfuTrackInfo = {
      trackName: info.trackName,
      mid: null,
      sessionId: info.sessionId,
      trackId: '',
      streamType: info.streamType,
    }

    try {
      await this.sfuClient.pullTracks([trackInfo])
    } catch (e) {
      console.error('Failed to pull SFU track:', e)
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
      // Polite peer pattern: if we already have a local offer (glare),
      // the peer with the lower ID rolls back
      if (pc.signalingState === 'have-local-offer') {
        const isPolite = this.localPeerId < fromPeerId
        if (isPolite) {
          await pc.setLocalDescription({ type: 'rollback' })
        } else {
          // We are impolite — ignore their offer, they should accept our offer
          return
        }
      }

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

    if (pc.signalingState !== 'have-local-offer') {
      // Ignore stale answers from a previous negotiation round
      return
    }

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

  private encodeDataForTransport = (data: unknown): unknown => {
    if (data instanceof ArrayBuffer) {
      return {
        __type: 'ArrayBuffer',
        __data: btoa(String.fromCharCode(...new Uint8Array(data))),
      }
    }
    if (data instanceof Uint8Array) {
      return {
        __type: 'Uint8Array',
        __data: btoa(String.fromCharCode(...data)),
      }
    }
    return data
  }

  private decodeDataFromTransport = (data: unknown): unknown => {
    if (
      data &&
      typeof data === 'object' &&
      '__type' in (data as Record<string, unknown>) &&
      '__data' in (data as Record<string, unknown>)
    ) {
      const typed = data as { __type: string; __data: string }
      const binary = Uint8Array.from(atob(typed.__data), c => c.charCodeAt(0))
      if (typed.__type === 'ArrayBuffer') {
        return binary.buffer
      }
      if (typed.__type === 'Uint8Array') {
        return binary
      }
    }
    return data
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
        const encoded = {
          ...message,
          data: this.encodeDataForTransport(message.data),
        }
        dc.send(JSON.stringify(encoded))
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

    if (this.sfuClient) {
      this.sfuClient.destroy()
      this.sfuClient = null
      this.sfuSessionReady = false
      this.sfuTrackNames.clear()
    }

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

    if (this.sfuEnabled && this.sfuClient && this.sfuSessionReady) {
      this.addStreamViaSfu(stream, metadata)
      return
    }

    this.addStreamViaP2P(stream, targetPeers, metadata)
  }

  private addStreamViaSfu = (
    stream: MediaStream,
    metadata: { type: StreamType }
  ) => {
    this.streamQueue.push(
      async () => {
        if (!this.sfuClient) return

        for (const track of stream.getTracks()) {
          const trackName = await this.sfuClient.pushTrack(
            track,
            stream,
            metadata.type
          )

          if (trackName) {
            this.sfuTrackNames.set(`${stream.id}_${track.id}`, trackName)

            const sfuSessionId = this.sfuClient.getSessionId()
            if (sfuSessionId) {
              this.broadcastSfuTrackInfo({
                trackName,
                sessionId: sfuSessionId,
                streamType: metadata.type,
              })
            }
          }
        }
      },
      () => sleep(streamQueueAddDelay)
    )

    this.processPendingStreams()
  }

  private addStreamViaP2P = (
    stream: MediaStream,
    targetPeers: string | string[] | null | undefined,
    metadata: { type: StreamType }
  ) => {
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

    if (this.sfuEnabled && this.sfuClient && this.sfuSessionReady) {
      this.removeStreamViaSfu(stream)
      return
    }

    this.removeStreamViaP2P(stream, targetPeers)
  }

  private removeStreamViaSfu = async (stream: MediaStream) => {
    if (!this.sfuClient) return

    for (const track of stream.getTracks()) {
      const key = `${stream.id}_${track.id}`
      const trackName = this.sfuTrackNames.get(key)
      if (trackName) {
        await this.sfuClient.unpushTrack(trackName)
        this.sfuTrackNames.delete(key)
      }
    }
  }

  private removeStreamViaP2P = (
    stream: MediaStream,
    targetPeers?: string | string[]
  ) => {
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

  private broadcastSfuTrackInfo = (info: {
    trackName: string
    sessionId: string
    streamType: StreamType
  }) => {
    const message: DataChannelMessage = {
      action: '__sfu_track_published__',
      data: info,
    }

    for (const [, dc] of this.dataChannels) {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify(message))
      }
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
