import { useContext } from 'react'
import Typography, { TypographyProps } from '@mui/material/Typography'

import { SettingsContext } from 'contexts/SettingsContext'
import { ShellContext } from 'contexts/ShellContext'

import { getPeerName } from './getPeerName'

interface PeerNameDisplayProps extends TypographyProps {
  children: string
}

export const PeerNameDisplay = ({
  children: userIdToResolve,
  ...rest
}: PeerNameDisplayProps) => {
  const { getUserSettings } = useContext(SettingsContext)
  const { peerList, customUsername: selfCustomUsername } =
    useContext(ShellContext)

  const { userId: selfUserId } = getUserSettings()

  const isPeerSelf = selfUserId === userIdToResolve
  const peer = peerList.find(peer => peer.userId === userIdToResolve)

  const userId = isPeerSelf ? selfUserId : peer?.userId
  const customUsername = isPeerSelf ? selfCustomUsername : peer?.customUsername

  if (userId === undefined) {
    throw new TypeError('peer lookup failed: userId is undefined')
  }

  return (
    <Typography component="span" {...rest}>
      {customUsername || getPeerName(userId)}
      {!isPeerSelf && customUsername ? (
        <Typography variant="caption"> ({getPeerName(userId)})</Typography>
      ) : null}
    </Typography>
  )
}
