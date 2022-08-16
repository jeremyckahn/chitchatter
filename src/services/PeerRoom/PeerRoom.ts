import { joinRoom, Room, RoomConfig } from 'trystero'

import { sleep } from 'utils'

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

// This abstraction is necessary because it takes some time for a PeerRoom to
// be torn down, and there is no way to detect when that happens. If a new
// PeerRoom is instantiated with the same config and roomId before the previous
// one is torn down, an error is thrown. The workaround is to continually
// trying to instantiate a PeerRoom until it succeeds.
export const getPeerRoom = async (config: RoomConfig, roomId: string) => {
  const timeout = 1000
  const epoch = Date.now()

  do {
    if (Date.now() - epoch > timeout) {
      throw new Error('Could not create PeerRoom')
    }

    try {
      return new PeerRoom(config, roomId)
    } catch (e) {}

    await sleep(100)
  } while (true)
}
