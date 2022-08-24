import { Room } from 'components/Room'
import { useParams } from 'react-router-dom'

interface PublicRoomProps {
  userId: string
}

export function PublicRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  return <Room userId={userId} roomId={roomId} />
}
