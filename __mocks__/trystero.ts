import { joinRoom as trysteroJoinRoom, Room, BaseRoomConfig } from 'trystero'

export const joinRoom: typeof trysteroJoinRoom = (
  _config: BaseRoomConfig,
  _roomId: string
) => {
  const room: Room = {
    makeAction: () => [() => Promise.resolve([]), () => {}, () => {}],
    ping: () => Promise.resolve(0),
    leave: () => {},
    getPeers: () => ({}),
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
