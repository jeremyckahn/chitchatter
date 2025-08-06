import { useContext, useEffect, useState } from 'react'
import { Room } from 'components/Room'
import { useParams } from 'react-router-dom'

import { ShellContext } from 'contexts/ShellContext'
import { notification } from 'services/Notification'
import { PasswordPrompt } from 'components/PasswordPrompt'
import { encryption } from 'services/Encryption'

interface PublicRoomProps {
  userId: string
}

export function PrivateRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)

  const urlParams = new URLSearchParams(window.location.search)
  const [secret, setSecret] = useState(urlParams.get('secret') ?? '')

  // Clear secret from address bar
  if (urlParams.has('secret')) {
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('secret')
    window.history.replaceState(window.history.state, '', newUrl.toString())
  }

  useEffect(() => {
    notification.requestPermission()
  }, [])

  useEffect(() => {
    setTitle(`Room: ${roomId}`)
  }, [roomId, setTitle])

  const handlePasswordEntered = async (password: string) => {
    if (password.length !== 0)
      setSecret(await encryption.encodePassword(roomId, password))
  }

  if (urlParams.has('pwd') && !urlParams.has('secret'))
    handlePasswordEntered(urlParams.get('pwd') ?? '')

  const awaitingSecret = secret.length === 0

  return awaitingSecret ? (
    <PasswordPrompt
      isOpen={awaitingSecret}
      onPasswordEntered={handlePasswordEntered}
    />
  ) : (
    <Room userId={userId} roomId={roomId} password={secret} />
  )
}
