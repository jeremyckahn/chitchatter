import { joinRoom, Room, BaseRoomConfig } from 'trystero'
import { TorrentRoomConfig } from 'trystero/torrent'

export enum PeerHookType {
  NEW_PEER = 'NEW_PEER',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SCREEN = 'SCREEN',
}

export enum PeerStreamType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SCREEN = 'SCREEN',
}

export class PeerRoom {
  private room: Room

  private roomConfig: TorrentRoomConfig & BaseRoomConfig

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

  constructor(config: TorrentRoomConfig & BaseRoomConfig, roomId: string) {
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

  getPeers: Room['getPeers'] = () => {
    return this.room.getPeers()
  }

  makeAction = <T>(namespace: string) => {
    return this.room.makeAction<T>(namespace)
  }

  addStream: Room['addStream'] = (...args) => {
    return this.room.addStream(...args)
  }

  removeStream: Room['removeStream'] = (stream, targetPeers) => {
    return this.room.removeStream(stream, targetPeers)
  }
}
