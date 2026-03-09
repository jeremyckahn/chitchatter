import { useContext, useEffect } from 'react'
import { Room } from 'components/Room'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { WholePageLoading } from 'components/Loading'
import { ShellContext } from 'contexts/ShellContext'
import { useThrottledRoomMount } from 'hooks/useThrottledRoomMount'
import { notification } from 'services/Notification'

interface PublicRoomProps {
  userId: string
}

export function PublicRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)
  const { t } = useTranslation()
  const canMount = useThrottledRoomMount(roomId)

  useEffect(() => {
    notification.requestPermission()
  }, [])

  useEffect(() => {
    setTitle(t('room.title', { roomId }))
  }, [roomId, setTitle, t])

  return canMount ? (
    <Room userId={userId} roomId={roomId} />
  ) : (
    <WholePageLoading />
  )
}
