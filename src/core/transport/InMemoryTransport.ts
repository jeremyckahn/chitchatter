import { PeerAction } from 'core/models/network'
import {
  ActionProgress,
  ActionReceiver,
  ActionSender,
  DataPayload,
  PeerConnectionType,
  PeerHookType,
  PeerJoinHandler,
  PeerLeaveHandler,
  PeerRoomAction,
  PeerTransport,
} from 'core/transport/types'

/**
 * The shared bus a set of {@link InMemoryTransport}s communicate over. One
 * network stands in for one room.
 */
class InMemoryNetwork {
  private members: Map<string, InMemoryTransport> = new Map()

  private listening: Set<string> = new Set()

  private connections: Map<string, Set<string>> = new Map()

  join = (peerId: string, transport: InMemoryTransport) => {
    this.members.set(peerId, transport)
    this.connections.set(peerId, new Set())
  }

  /**
   * Marks a member as ready to receive peer-join notifications.
   *
   * Two members are only announced to each other once BOTH are listening,
   * which is how the real transport behaves: Trystero fires onPeerJoin when a
   * WebRTC connection establishes, and that cannot happen before both sides
   * have joined the room and wired up their handlers.
   */
  startListening = (peerId: string) => {
    if (this.listening.has(peerId)) return

    this.listening.add(peerId)

    for (const otherPeerId of this.listening) {
      if (otherPeerId === peerId) continue

      this.connect(peerId, otherPeerId)
    }
  }

  private connect = (a: string, b: string) => {
    if (this.connections.get(a)?.has(b)) return

    this.connections.get(a)?.add(b)
    this.connections.get(b)?.add(a)

    this.members.get(a)?.receivePeerJoin(b)
    this.members.get(b)?.receivePeerJoin(a)
  }

  /** The peers this member is connected to. */
  getConnectedPeerIds = (peerId: string) => [
    ...(this.connections.get(peerId) ?? []),
  ]

  leave = (peerId: string) => {
    this.members.delete(peerId)
    this.listening.delete(peerId)
    this.connections.delete(peerId)

    for (const [otherPeerId, connected] of this.connections) {
      connected.delete(peerId)

      this.members.get(otherPeerId)?.receivePeerLeave(peerId)
    }
  }

  getPeerIds = (selfPeerId: string) =>
    [...this.members.keys()].filter(peerId => peerId !== selfPeerId)

  deliver = (
    fromPeerId: string,
    actionName: string,
    data: DataPayload,
    target?: string | string[] | null
  ) => {
    const targets =
      target === undefined || target === null
        ? this.getPeerIds(fromPeerId)
        : [target].flat()

    for (const peerId of targets) {
      if (peerId === fromPeerId) continue

      this.members.get(peerId)?.receiveAction(actionName, data, fromPeerId)
    }
  }
}

export const createInMemoryNetwork = () => new InMemoryNetwork()

/**
 * A {@link PeerTransport} that routes messages between instances in the same
 * process, with no WebRTC, no trackers and no DOM.
 *
 * This exists so the chat core can be tested for real — two actual clients
 * exchanging actual messages — in a Node environment. It mirrors
 * `TrysteroTransport`'s semantics deliberately, including the single-handler
 * -per-`PeerHookType` fan-out and the connect/disconnect receiver indirection.
 */
export class InMemoryTransport implements PeerTransport {
  readonly peerId: string

  private network: InMemoryNetwork

  private hasLeft = false

  private peerJoinHandlers: Map<PeerHookType, PeerJoinHandler> = new Map()

  private peerLeaveHandlers: Map<PeerHookType, PeerLeaveHandler> = new Map()

  private receivers: Map<
    string,
    ((data: DataPayload, peerId: string) => void) | null
  > = new Map()

  private actions: Partial<Record<string, PeerRoomAction<any>>> = {}

  constructor(network: InMemoryNetwork, peerId: string) {
    this.network = network
    this.peerId = peerId
    network.join(peerId, this)
  }

  /** @internal — called by the network, not by consumers. */
  receivePeerJoin = (peerId: string) => {
    for (const [, handler] of this.peerJoinHandlers) handler(peerId)
  }

  /** @internal — called by the network, not by consumers. */
  receivePeerLeave = (peerId: string) => {
    for (const [, handler] of this.peerLeaveHandlers) handler(peerId)
  }

  /** @internal — called by the network, not by consumers. */
  receiveAction = (
    actionName: string,
    data: DataPayload,
    fromPeerId: string
  ) => {
    if (this.hasLeft) return

    this.receivers.get(actionName)?.(data, fromPeerId)
  }

  makeAction = <T extends DataPayload>(
    peerAction: PeerAction,
    namespace: string
  ): PeerRoomAction<T> => {
    const actionName = `${namespace}.${peerAction}`

    if (actionName in this.actions) {
      return this.actions[actionName] as PeerRoomAction<T>
    }

    this.receivers.set(actionName, null)

    const sender: ActionSender<T> = async (data, options) => {
      if (this.hasLeft) return

      this.network.deliver(this.peerId, actionName, data, options?.target)
    }

    const connectReceiver: ActionReceiver<T> = callback => {
      this.receivers.set(actionName, (data, peerId) => {
        callback(data as T, { peerId })
      })
    }

    const disconnectReceiver = () => {
      this.receivers.set(actionName, null)
    }

    // Progress reporting is a WebRTC chunking concern with no in-process
    // analogue, so this is intentionally inert.
    const progress: ActionProgress = () => {}

    const action: PeerRoomAction<T> = [
      sender,
      connectReceiver,
      progress,
      disconnectReceiver,
    ]

    this.actions[actionName] = action

    return action
  }

  onPeerJoin = (peerHookType: PeerHookType, fn: PeerJoinHandler) => {
    const alreadyConnected = this.network.getConnectedPeerIds(this.peerId)

    this.peerJoinHandlers.set(peerHookType, fn)
    this.network.startListening(this.peerId)

    // A handler registered after a connection was already established still
    // needs to hear about it — the media hooks register theirs well after the
    // chat core registers its own.
    for (const peerId of alreadyConnected) fn(peerId)
  }

  onPeerLeave = (peerHookType: PeerHookType, fn: PeerLeaveHandler) => {
    this.peerLeaveHandlers.set(peerHookType, fn)
    this.network.startListening(this.peerId)
  }

  getPeers = () => this.network.getPeerIds(this.peerId)

  /**
   * There is no ICE negotiation in process, so there is nothing to classify.
   * `ChatRoom` must tolerate an empty result rather than assume every peer
   * appears here — which is also true on the web before candidates settle.
   */
  getPeerConnectionTypes = async (): Promise<
    Record<string, PeerConnectionType>
  > => ({})

  leaveRoom = () => {
    this.hasLeft = true
    this.network.leave(this.peerId)
    this.flush()
  }

  flush = () => {
    this.peerJoinHandlers = new Map()
    this.peerLeaveHandlers = new Map()

    for (const actionName of this.receivers.keys()) {
      this.receivers.set(actionName, null)
    }
  }
}
