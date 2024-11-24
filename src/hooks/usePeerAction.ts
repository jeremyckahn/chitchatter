import { PeerRoom } from 'lib/PeerRoom'
import { PeerAction } from 'models/network'
import { useEffect, useState } from 'react'
import {
  ActionProgress,
  ActionReceiver,
  ActionSender,
  DataPayload,
} from 'trystero'

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
  const [[sender, dispatchReceiver, progress, detatchReceiver]] = useState(() =>
    peerRoom.makeAction<T>(peerAction, namespace)
  )

  useEffect(() => {
    dispatchReceiver(onReceive)

    return () => {
      detatchReceiver()
    }
  }, [detatchReceiver, onReceive, dispatchReceiver])

  return [sender, progress]
}
