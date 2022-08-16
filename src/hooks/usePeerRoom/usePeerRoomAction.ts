import { useState } from 'react'

import { PeerRoom } from 'services/PeerRoom'

export enum PeerActions {
  MESSAGE = 'MESSAGE',
}

export function usePeerRoomAction<T>(peerRoom: PeerRoom, action: PeerActions) {
  const [peerRoomAction] = useState(() => peerRoom.makeAction<T>(action))

  return peerRoomAction
}
