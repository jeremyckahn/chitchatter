import type {
  ActionProgressHandler,
  DataPayload,
  MessageAction,
  MessageContext,
} from '@trystero-p2p/torrent'

import { PeerAction } from 'core/models/network'

/**
 * Which feature registered a peer-join/leave handler. Trystero exposes a single
 * `onPeerJoin`/`onPeerLeave` slot per room, so handlers are keyed by type and
 * fanned out — this is what lets chat, audio, video, screen share and file
 * share each hold one handler without clobbering the others.
 */
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

/**
 * Action names are prefixed with a namespace so that a single underlying room
 * can carry both group chat and direct messages.
 */
export enum ActionNamespace {
  GROUP = 'g',
  DIRECT_MESSAGE = 'dm',
}

export type ActionSender<T extends DataPayload> = MessageAction<T>['send']

export type ActionReceiver<T extends DataPayload> = (
  callback: NonNullable<MessageAction<T>['onMessage']>
) => void

export type ActionProgress = (fn: ActionProgressHandler) => void

/**
 * `[send, connectReceiver, onProgress, disconnectReceiver]`.
 *
 * The receiver is connect/disconnect rather than a plain callback because
 * Trystero allows only one `onMessage` per action for the lifetime of the room,
 * while consumers come and go.
 */
export type PeerRoomAction<T extends DataPayload> = [
  ActionSender<T>,
  ActionReceiver<T>,
  ActionProgress,
  () => void,
]

export type PeerJoinHandler = (peerId: string) => void

export type PeerLeaveHandler = (peerId: string) => void

/**
 * The transport surface the chat core depends on — deliberately narrower than
 * {@link TrysteroTransport}, which also carries the media-stream methods that
 * only the web app uses.
 *
 * Implemented by `TrysteroTransport` (WebRTC, production) and
 * `InMemoryTransport` (in-process, tests).
 */
export interface PeerTransport {
  makeAction: <T extends DataPayload>(
    peerAction: PeerAction,
    namespace: string
  ) => PeerRoomAction<T>
  onPeerJoin: (peerHookType: PeerHookType, fn: PeerJoinHandler) => void
  onPeerLeave: (peerHookType: PeerHookType, fn: PeerLeaveHandler) => void
  getPeers: () => string[]
  getPeerConnectionTypes: () => Promise<Record<string, PeerConnectionType>>
  leaveRoom: () => void
  flush: () => void
}

export type { DataPayload, MessageContext }
