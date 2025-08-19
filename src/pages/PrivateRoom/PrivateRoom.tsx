import { Room } from 'components/Room'
import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { WholePageLoading } from 'components/Loading'
import { PasswordPrompt } from 'components/PasswordPrompt'
import { allowAdvancedRoomLinkSharing } from 'components/Shell/constants'
import { ShellContext } from 'contexts/ShellContext'
import { useThrottledRoomMount } from 'hooks/useThrottledRoomMount'
import { encryption } from 'services/Encryption'
import { notification } from 'services/Notification'

interface PublicRoomProps {
  userId: string
}

export function PrivateRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)
  const canMount = useThrottledRoomMount(roomId)

  const urlParams = new URLSearchParams(window.location.hash.substring(1))

  if (allowAdvancedRoomLinkSharing && window.location.hash.length > 0) {
    // Clear secret from address bar
    window.history.replaceState(window.history.state, '', '#')
  }

  const [secret, setSecret] = useState(urlParams.get('secret') ?? '')

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

  if (awaitingSecret) {
    return (
      <PasswordPrompt
        isOpen={awaitingSecret}
        onPasswordEntered={handlePasswordEntered}
      />
    )
  }

  return canMount ? (
    <Room userId={userId} roomId={roomId} password={secret} />
  ) : (
    <WholePageLoading />
  )
}
