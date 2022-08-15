import { joinRoom, Room, RoomConfig } from 'trystero'

export class PeerRoom {
  private room?: Room

  private roomConfig: RoomConfig

  constructor(config: RoomConfig) {
    this.roomConfig = config
  }

  joinRoom = (roomId: string) => {
    this.room = joinRoom(this.roomConfig, roomId)
  }

  leaveRoom = () => {
    if (this.room) {
      this.room.leave()
    }
  }

  makeAction = <T>(namespace: string) => {
    if (!this.room) {
      throw new Error('PeerRoom: Called makeAction before joinRoom')
    }

    return this.room.makeAction<T>(namespace)
  }
}
