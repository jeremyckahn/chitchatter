import { useEffect, useState } from 'react'

import {
  ActionProgress,
  ActionReceiver,
  ActionSender,
  DataPayload,
  PeerRoom,
} from 'lib/PeerRoom'
import { PeerAction } from 'models/network'

export const usePeerAction = <T extends DataPayload>({
  peerRoom,
  peerAction,
  onReceive,
  namespace,
}: {
  peerRoom: PeerRoom
  peerAction: PeerAction
  onReceive: Parameters<ActionReceiver<T>>[0]
  namespace: string
}): [ActionSender<T>, ActionProgress] => {
  const [[sender, connectReceiver, progress, disconnectReceiver]] = useState(
    () => peerRoom.makeAction<T>(peerAction, namespace)
  )

  useEffect(() => {
    connectReceiver(onReceive)

    return () => {
      disconnectReceiver()
    }
  }, [disconnectReceiver, onReceive, connectReceiver])

  return [sender, progress]
}
