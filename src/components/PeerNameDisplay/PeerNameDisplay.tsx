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
  const { userId, customUsername, getFriendlyName } =
    usePeerNameDisplay(userIdToResolve)

  const friendlyName = getFriendlyName(userIdToResolve)

  if (customUsername === friendlyName) {
    return (
      <Typography component="span" {...rest}>
        {friendlyName}
        <Typography variant="caption"> ({getPeerName(userId)})</Typography>
      </Typography>
    )
  } else {
    return (
      <Typography component="span" {...rest}>
        {getPeerName(userId)}
      </Typography>
    )
  }
}
