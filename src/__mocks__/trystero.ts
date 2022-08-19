import { joinRoom as trysteroJoinRoom, RoomConfig, Room } from 'trystero'

export const joinRoom: typeof trysteroJoinRoom = (
  _config: RoomConfig,
  _roomId: string
) => {
  const room: Room = {
    makeAction: () => [() => {}, () => {}, () => {}],
    ping: () => Promise.resolve(0),
    leave: () => {},
    getPeers: () => [],
    addStream: () => [Promise.resolve()],
    removeStream: () => {},
    addTrack: () => [Promise.resolve()],
    removeTrack: () => {},
    replaceTrack: () => [Promise.resolve()],
    onPeerJoin: () => {},
    onPeerLeave: () => {},
    onPeerStream: () => {},
    onPeerTrack: () => {},
  }

  return room
}

export const selfId = ''
