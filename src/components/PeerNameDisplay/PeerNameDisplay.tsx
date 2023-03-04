import Typography, { TypographyProps } from '@mui/material/Typography'

import { usePeerNameDisplay } from './usePeerNameDisplay'
import { getPeerName } from './getPeerName'

interface PeerNameDisplayProps extends TypographyProps {
  children: string
}

export const PeerNameDisplay = ({
  children: userId,
  ...rest
}: PeerNameDisplayProps) => {
  const { getCustomUsername, getFriendlyName } = usePeerNameDisplay()

  const friendlyName = getFriendlyName(userId)
  const customUsername = getCustomUsername(userId)

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
