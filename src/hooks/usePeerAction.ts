import { PeerRoom } from 'core/transport/TrysteroTransport'
import { PeerAction } from 'core/models/network'
import { useEffect, useState } from 'react'
import { DataPayload, MessageContext } from 'trystero'
import { ActionProgress, ActionSender } from 'core/transport/TrysteroTransport'

export const usePeerAction = <T extends DataPayload>({
  peerRoom,
  peerAction,
  onReceive,
  namespace,
}: {
  peerRoom: PeerRoom
  peerAction: PeerAction
  onReceive: (data: T, context: MessageContext) => void | Promise<void>
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
