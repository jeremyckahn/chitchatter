import { useContext, useEffect, useState } from 'react'
import { Room } from 'components/Room'
import { useParams } from 'react-router-dom'

import { ShellContext } from 'contexts/ShellContext'
import { notification } from 'services/Notification'
import { PasswordPrompt } from 'components/PasswordPrompt'
import { encryption } from 'services/Encryption'
import { useRoom } from 'components/Room/useRoom'
import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'
import { v4 } from 'uuid'
import { time } from 'lib/Time'
import { SettingsContext } from 'contexts/SettingsContext'

interface PublicRoomProps {
  userId: string
}

export function PrivateRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)
  const settingsContext = useContext(SettingsContext)

  const urlParams = new URLSearchParams(window.location.hash.substring(1))
  // Clear secret from address bar
  if (window.location.hash.length > 0)
    window.history.replaceState(window.history.state, '', '#')
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

  const { publicKey } = settingsContext.getUserSettings()

  const roomProps = useRoom(
    {
      appId: `${encodeURI(window.location.origin)}_${process.env.VITE_NAME}`,
      relayUrls: trackerUrls,
      rtcConfig,
      relayRedundancy: 4,
      password: secret,
    },
    {
      roomId,
      userId,
      getUuid: v4,
      publicKey,
      encryptionService: encryption,
      timeService: time,
    }
  )

  return awaitingSecret ? (
    <PasswordPrompt
      isOpen={awaitingSecret}
      onPasswordEntered={handlePasswordEntered}
    />
  ) : (
    <Room userId={userId} {...roomProps} />
  )
}
