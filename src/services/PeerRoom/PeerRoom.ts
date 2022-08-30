import { joinRoom, Room, RoomConfig } from 'trystero'

export class PeerRoom {
  private room: Room

  private roomConfig: RoomConfig

  private numberOfPeers: number

  constructor(config: RoomConfig, roomId: string) {
    this.roomConfig = config
    this.room = joinRoom(this.roomConfig, roomId)
    this.numberOfPeers = 1 // Includes this peer
  }

  onPeersChange = (handlePeersChange: (numberOfPeers: number) => void) => {
    if (!this.room) return

    this.room.onPeerJoin(() => {
      this.numberOfPeers++
      handlePeersChange(this.numberOfPeers)
    })

    this.room.onPeerLeave(() => {
      this.numberOfPeers--
      handlePeersChange(this.numberOfPeers)
    })
  }

  leaveRoom = () => {
    if (!this.room) return
    this.room.leave()
  }

  makeAction = <T>(namespace: string) => {
    return this.room.makeAction<T>(namespace)
  }
}
