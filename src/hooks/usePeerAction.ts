import { PeerRoom } from 'lib/PeerRoom'
import { PeerAction } from 'models/network'
import { useEffect, useState } from 'react'
import { DataPayload } from 'trystero'
import { ActionProgress, ActionSender } from 'lib/PeerRoom'

export const usePeerAction = <T extends DataPayload>({
  peerRoom,
  peerAction,
  onReceive,
  namespace,
}: {
  peerRoom: PeerRoom
  peerAction: PeerAction
  onReceive: (data: T, peerId: string) => void | Promise<void>
  namespace: string
}): [ActionSender<T>, ActionProgress] => {
  const [[sender, connectReceiver, progress, disconnectReceiver]] = useState(
    () => peerRoom.makeAction<T>(peerAction, namespace)
  )

  useEffect(() => {
    connectReceiver((data, context) => onReceive(data, context.peerId))

    return () => {
      disconnectReceiver()
    }
  }, [disconnectReceiver, onReceive, connectReceiver])

  return [sender, progress]
}
