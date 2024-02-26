export const joinRoom = (_config, _roomId) => {
  const room = {
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
