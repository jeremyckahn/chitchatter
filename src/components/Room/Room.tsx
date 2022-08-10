import { useParams } from 'react-router-dom'

export function Room() {
  const params = useParams()

  const { roomId } = params

  return <>Room ID: {roomId}</>
}
