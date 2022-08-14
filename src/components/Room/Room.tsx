import { useParams } from 'react-router-dom'

import { usePeerRoom } from '../../hooks/usePeerRoom'

export function Room() {
  const { roomId = '' } = useParams()

  usePeerRoom({
    appId: process.env.REACT_APP_NAME || '',
    roomId,
  })

  return <>Room ID: {roomId}</>
}
