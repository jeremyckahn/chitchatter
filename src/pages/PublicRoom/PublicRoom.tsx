import { Room } from 'components/Room'

interface PublicRoomProps {
  userId: string
}

export function PublicRoom({ userId }: PublicRoomProps) {
  return <Room userId={userId} />
}
