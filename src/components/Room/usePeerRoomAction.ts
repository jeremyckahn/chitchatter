import { useState } from 'react'

import { PeerRoom } from 'services/PeerRoom'
import { PeerActions } from 'models/network'

export function usePeerRoomAction<T>(peerRoom: PeerRoom, action: PeerActions) {
  const [peerRoomAction] = useState(() => peerRoom.makeAction<T>(action))

  return peerRoomAction
}
