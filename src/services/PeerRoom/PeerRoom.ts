import { joinRoom, Room, RoomConfig } from 'trystero'
import memoize from 'fast-memoize'

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

// Memoization isn't just a performance optimization here. It is necessary to
// prevent subsequent calls to getPeerRoom from causing a room collision due to
// the amount of time it takes for Trystero rooms to be torn down (which is an
// asynchronous operation).
export const getPeerRoom = memoize((config: RoomConfig, roomId: string) => {
  return new PeerRoom(config, roomId)
})
