import { lazy, Suspense, useContext, useEffect } from 'react'
//import { Room } from 'components/Room'
import { useParams } from 'react-router-dom'

import { ShellContext } from 'contexts/ShellContext'
import { NotificationService } from 'services/Notification'
import { WholePageLoading } from 'components/Loading'

interface PublicRoomProps {
  userId: string
}

// @ts-ignore
const Room = lazy(() => import('../../components/Room/Room'))

export function PublicRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)

  useEffect(() => {
    NotificationService.requestPermission()
  }, [])

  useEffect(() => {
    setTitle(`Room: ${roomId}`)
  }, [roomId, setTitle])

  return (
    <Suspense fallback={<WholePageLoading />}>
      <Room userId={userId} roomId={roomId} />
    </Suspense>
  )
}
