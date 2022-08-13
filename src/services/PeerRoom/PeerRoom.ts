import { joinRoom } from 'trystero'

export class PeerRoom {
  room: any

  joinRoom(roomId: string) {
    this.room = joinRoom({ appId: process.env.REACT_APP_NAME }, roomId)
  }

  leaveRoom() {
    if (this.room) {
      this.room.leave()
    }
  }
}
