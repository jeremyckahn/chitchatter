import { useContext, useEffect } from 'react'
import { Room } from 'components/Room'
import { useParams } from 'react-router-dom'

import { ShellContext } from 'contexts/ShellContext'
import { notification } from 'services/Notification'
import { useRoom } from 'components/Room/useRoom'
import { rtcConfig } from 'config/rtcConfig'
import { trackerUrls } from 'config/trackerUrls'
import { SettingsContext } from 'contexts/SettingsContext'
import { v4 } from 'uuid'
import { encryption } from 'services/Encryption'
import { time } from 'lib/Time'

interface PublicRoomProps {
  userId: string
}

export function PublicRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)
  const settingsContext = useContext(SettingsContext)

  useEffect(() => {
    notification.requestPermission()
  }, [])

  useEffect(() => {
    setTitle(`Room: ${roomId}`)
  }, [roomId, setTitle])

  const { publicKey } = settingsContext.getUserSettings()

  const roomProps = useRoom(
    {
      appId: `${encodeURI(window.location.origin)}_${process.env.VITE_NAME}`,
      relayUrls: trackerUrls,
      rtcConfig,
      relayRedundancy: 4,
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

  return <Room userId={userId} {...roomProps} />
}
