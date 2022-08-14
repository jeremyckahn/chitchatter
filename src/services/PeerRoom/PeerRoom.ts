import { joinRoom, Room } from 'trystero'

export class PeerRoom {
  private room?: Room

  joinRoom(appId: string, roomId: string) {
    this.room = joinRoom({ appId }, roomId)
  }

  leaveRoom() {
    if (this.room) {
      this.room.leave()
    }
  }
}
