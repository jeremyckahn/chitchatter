import { joinRoom, Room, RoomConfig } from 'trystero'

export class PeerRoom {
  private room: Room

  private roomConfig: RoomConfig

  constructor(config: RoomConfig, roomId: string) {
    this.roomConfig = config
    this.room = joinRoom(this.roomConfig, roomId)
  }

  leaveRoom = () => {
    if (this.room) {
      this.room.leave()
    }
  }

  makeAction = <T>(namespace: string) => {
    return this.room.makeAction<T>(namespace)
  }
}
