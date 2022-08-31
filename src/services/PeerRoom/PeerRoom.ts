import { joinRoom, Room, RoomConfig } from 'trystero'

export class PeerRoom {
  private room: Room

  private roomConfig: RoomConfig

  constructor(config: RoomConfig, roomId: string) {
    this.roomConfig = config
    this.room = joinRoom(this.roomConfig, roomId)
  }

  leaveRoom = () => {
    if (!this.room) return
    this.room.leave()
  }

  onPeerJoin: Room['onPeerJoin'] = fn => {
    if (!this.room) return
    this.room.onPeerJoin((...args) => fn(...args))
  }

  onPeerLeave: Room['onPeerLeave'] = fn => {
    if (!this.room) return
    this.room.onPeerLeave((...args) => fn(...args))
  }

  makeAction = <T>(namespace: string) => {
    return this.room.makeAction<T>(namespace)
  }
}
