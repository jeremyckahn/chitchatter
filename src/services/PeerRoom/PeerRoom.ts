import { joinRoom } from 'trystero'

export class PeerRoom {
  room: any

  joinRoom(appId: string, roomId: string) {
    this.room = joinRoom({ appId }, roomId)
  }

  leaveRoom() {
    if (this.room) {
      this.room.leave()
    }
  }
}
