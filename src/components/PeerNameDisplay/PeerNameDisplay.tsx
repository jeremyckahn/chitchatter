import Typography, { TypographyProps } from '@mui/material/Typography'

import { getPeerName } from './getPeerName'

interface PeerNameDisplayProps extends TypographyProps {
  children: string
}

export const PeerNameDisplay = ({
  children,
  ...rest
}: PeerNameDisplayProps) => {
  return (
    <Typography component="span" {...rest}>
      {getPeerName(children)}
    </Typography>
  )
}
