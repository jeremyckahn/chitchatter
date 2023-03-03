import Typography, { TypographyProps } from '@mui/material/Typography'

import { usePeerNameDisplay } from './usePeerNameDisplay'
import { getPeerName } from './getPeerName'

interface PeerNameDisplayProps extends TypographyProps {
  children: string
}

export const PeerNameDisplay = ({
  children: userIdToResolve,
  ...rest
}: PeerNameDisplayProps) => {
  const { userId, customUsername, isPeerSelf } =
    usePeerNameDisplay(userIdToResolve)

  return (
    <Typography component="span" {...rest}>
      {customUsername || getPeerName(userId)}
      {!isPeerSelf(userIdToResolve) && customUsername ? (
        <Typography variant="caption"> ({getPeerName(userId)})</Typography>
      ) : null}
    </Typography>
  )
}
