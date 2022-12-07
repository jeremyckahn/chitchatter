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

  const urlParams = new URLSearchParams(window.location.hash.substring(1))
  const urlSecret = urlParams.get('secret') ?? ''
  window.location.hash = ''
  const [secret, setSecret] = useState(urlSecret)

  useEffect(() => {
    NotificationService.requestPermission()
  }, [])

  useEffect(() => {
    setTitle(`Room: ${roomId}`)
  }, [roomId, setTitle])

  const handlePasswordEntered = async (password: string) => {
    const data = new TextEncoder().encode(password)
    const digest = await window.crypto.subtle.digest('SHA-256', data)
    const bytes = new Uint8Array(digest)
    const secret = window.btoa(String.fromCharCode(...bytes))
    setSecret(secret)
  }

  const hasSecret = secret.length === 0

  return hasSecret ? (
    <PasswordPrompt
      isOpen={hasSecret}
      onPasswordEntered={handlePasswordEntered}
    />
  ) : (
    <Room userId={userId} roomId={roomId} password={secret} />
  )
}
