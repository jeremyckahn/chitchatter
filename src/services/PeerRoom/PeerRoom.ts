import { joinRoom, Room, BaseRoomConfig } from 'trystero'
import { TorrentRoomConfig } from 'trystero/torrent'

export class PeerRoom {
  private room: Room

  private roomConfig: TorrentRoomConfig & BaseRoomConfig

  private peerJoinHandlers: Set<(peerId: string) => void> = new Set()

  private peerLeaveHandlers: Set<(peerId: string) => void> = new Set()

  private peerStreamHandlers: Set<
    (stream: MediaStream, peerId: string) => void
  > = new Set()

  constructor(config: TorrentRoomConfig & BaseRoomConfig, roomId: string) {
    this.roomConfig = config
    this.room = joinRoom(this.roomConfig, roomId)

    this.room.onPeerJoin((...args) => {
      for (const peerJoinHandler of this.peerJoinHandlers) {
        peerJoinHandler(...args)
      }
    })

    this.room.onPeerLeave((...args) => {
      for (const peerLeaveHandler of this.peerLeaveHandlers) {
        peerLeaveHandler(...args)
      }
    })

    this.room.onPeerStream((...args) => {
      for (const peerStreamHandler of this.peerStreamHandlers) {
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

  onPeerJoin: Room['onPeerJoin'] = fn => {
    this.peerJoinHandlers.add(fn)
  }

  onPeerJoinFlush = () => {
    this.peerJoinHandlers.forEach(handler =>
      this.peerJoinHandlers.delete(handler)
    )
  }

  onPeerLeave: Room['onPeerLeave'] = fn => {
    this.peerLeaveHandlers.add(fn)
  }

  onPeerLeaveFlush = () => {
    this.peerLeaveHandlers.forEach(handler =>
      this.peerLeaveHandlers.delete(handler)
    )
  }

  onPeerStream: Room['onPeerStream'] = fn => {
    this.peerStreamHandlers.add(fn)
  }

  onPeerStreamFlush = () => {
    this.peerStreamHandlers.forEach(handler =>
      this.peerStreamHandlers.delete(handler)
    )
  }

  getPeers: Room['getPeers'] = () => {
    return this.room.getPeers()
  }

  makeAction = <T>(namespace: string) => {
    return this.room.makeAction<T>(namespace)
  }

  addStream: Room['addStream'] = stream => {
    return this.room.addStream(stream)
  }

  removeStream: Room['removeStream'] = (stream, targetPeers) => {
    return this.room.removeStream(stream, targetPeers)
  }
}
