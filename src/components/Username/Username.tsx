import { PeerNameDisplay } from 'components/PeerNameDisplay/PeerNameDisplay'

interface UsernameProps {
  userId: string
}

export const Username = ({ userId }: UsernameProps) => {
  return (
    <>
      <PeerNameDisplay>{userId}</PeerNameDisplay> (you)
    </>
  )
}
