import Typography, { TypographyProps } from '@mui/material/Typography'

import { getPeerFingerprint } from 'core/names/peerNames'

export const peerFingerprintLabel = 'Fingerprint'

export interface PeerFingerprintProps extends TypographyProps {
  userId: string
}

/**
 * A user's key fingerprint, the identifier people compare to be sure who they
 * are talking to. Renders nothing for an id that no key derives.
 */
export const PeerFingerprint = ({ userId, ...rest }: PeerFingerprintProps) => {
  const fingerprint = getPeerFingerprint(userId)

  if (fingerprint === null) return null

  return (
    <Typography
      component="span"
      variant="caption"
      aria-label={`${peerFingerprintLabel}: ${fingerprint}`}
      sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}
      {...rest}
    >
      {fingerprint}
    </Typography>
  )
}
