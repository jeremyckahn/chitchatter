import { Room } from 'components/Room'
import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { WholePageLoading } from 'components/Loading'
import { PasswordPrompt } from 'components/PasswordPrompt'
import { allowAdvancedRoomLinkSharing } from 'components/Shell/constants'
import { ShellContext } from 'contexts/ShellContext'
import { useDelayedFlag } from 'hooks/useDelayedFlag'
import { useThrottledRoomMount } from 'hooks/useThrottledRoomMount'
import { encryption } from 'core/crypto/Encryption'
import { notification } from 'services/Notification'

interface PublicRoomProps {
  userId: string
}

/** Where the room secret comes from, while it is not yet known. */
export enum RoomSecretSource {
  /** Nothing usable in the link: ask for the password. */
  PROMPT = 'prompt',
  /** Deriving the secret from the link, with no prompt on screen. */
  LINK = 'link',
  /** The link carried a secret that could not be read. */
  INVALID_LINK = 'invalidLink',
}

export const invalidLinkNotice =
  "This room link couldn't be read. Enter the room password to join."

export const joiningSecurelyLabel = 'Joining securely…'

interface RoomLinkParams {
  secret: string | null
  pwd: string | null
}

const readRoomLinkParams = (): RoomLinkParams => {
  const urlParams = new URLSearchParams(window.location.hash.substring(1))

  return { secret: urlParams.get('secret'), pwd: urlParams.get('pwd') }
}

const initialSecretSource = ({ secret, pwd }: RoomLinkParams) =>
  secret !== null || (pwd !== null && pwd.length > 0)
    ? RoomSecretSource.LINK
    : RoomSecretSource.PROMPT

export function PrivateRoom({ userId }: PublicRoomProps) {
  const { roomId = '' } = useParams()
  const { setTitle } = useContext(ShellContext)
  const canMount = useThrottledRoomMount(roomId)

  // Read once: the hash is cleared below, and must not be re-read (or
  // re-derived) on every render.
  const [linkParams] = useState(readRoomLinkParams)
  const [secret, setSecret] = useState('')
  const [secretSource, setSecretSource] = useState(() =>
    initialSecretSource(linkParams)
  )

  const isResolvingLink =
    secret.length === 0 && secretSource === RoomSecretSource.LINK
  const showJoiningLabel = useDelayedFlag(isResolvingLink)

  useEffect(() => {
    if (allowAdvancedRoomLinkSharing && window.location.hash.length > 0) {
      // Clear secret from address bar
      window.history.replaceState(window.history.state, '', '#')
    }
  }, [])

  useEffect(() => {
    notification.requestPermission()
  }, [])

  useEffect(() => {
    setTitle(`Room: ${roomId}`)
  }, [roomId, setTitle])

  useEffect(() => {
    const { secret: linkSecret, pwd } = linkParams
    let isCancelled = false

    const resolveLinkSecret = async () => {
      if (linkSecret !== null) {
        // Links copied before the room secret had a work factor carry the
        // legacy digest, which is upgraded here without needing the password.
        const resolvedSecret = await encryption.resolveRoomLinkSecret(
          roomId,
          linkSecret
        )

        if (isCancelled) return

        if (resolvedSecret === undefined) {
          setSecretSource(RoomSecretSource.INVALID_LINK)
        } else {
          setSecret(resolvedSecret)
        }

        return
      }

      if (pwd !== null && pwd.length > 0) {
        const derivedSecret = await encryption.encodePassword(roomId, pwd)

        if (!isCancelled) setSecret(derivedSecret)
      }
    }

    resolveLinkSecret().catch((error: unknown) => {
      console.error(error)
      if (!isCancelled) setSecretSource(RoomSecretSource.INVALID_LINK)
    })

    return () => {
      isCancelled = true
    }
  }, [linkParams, roomId])

  const handlePasswordEntered = async (password: string) => {
    if (password.length === 0) return

    setSecret(await encryption.encodePassword(roomId, password))
  }

  if (!canMount) {
    return <WholePageLoading />
  }

  if (secret.length > 0) {
    return <Room userId={userId} roomId={roomId} password={secret} />
  }

  if (isResolvingLink) {
    return (
      <WholePageLoading
        label={showJoiningLabel ? joiningSecurelyLabel : undefined}
      />
    )
  }

  return (
    <PasswordPrompt
      isOpen
      onPasswordEntered={handlePasswordEntered}
      notice={
        secretSource === RoomSecretSource.INVALID_LINK
          ? invalidLinkNotice
          : undefined
      }
    />
  )
}
