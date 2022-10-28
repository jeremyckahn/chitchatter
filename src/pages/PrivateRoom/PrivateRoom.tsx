import { useContext, useEffect, useState } from 'react'
import { Room } from 'components/Room'
import { useParams } from 'react-router-dom'

import { ShellContext } from 'contexts/ShellContext'
import { NotificationService } from 'services/Notification'
import { PasswordPrompt } from 'components/PasswordPrompt/PasswordPrompt'

interface PublicRoomProps {
  userId: string
}

export function PrivateRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)
  const [password, setPassword] = useState('')

  useEffect(() => {
    NotificationService.requestPermission()
  }, [])

  useEffect(() => {
    setTitle(`Room: ${roomId}`)
  }, [roomId, setTitle])

  const handlePasswordEntered = (password: string) => {
    setPassword(password)
  }

  const isPasswordEntered = password.length === 0

  return isPasswordEntered ? (
    <PasswordPrompt
      isOpen={isPasswordEntered}
      onPasswordEntered={handlePasswordEntered}
    />
  ) : (
    <Room userId={userId} roomId={roomId} password={password} />
  )
}
