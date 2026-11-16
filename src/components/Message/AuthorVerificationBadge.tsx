import NoEncryptionIcon from '@mui/icons-material/NoEncryption'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'

import { PeerVerificationState } from 'core/models/chat'

export const unverifiedAuthorLabel =
  'The sender of this message could not be verified with public-key cryptography. They may be misrepresenting themself. Be careful with what you share with them.'

export const verifyingAuthorLabel = 'Attempting to verify the sender...'

export interface AuthorVerificationBadgeProps {
  verificationState: PeerVerificationState | undefined
}

/**
 * Flags a message whose sender has not proven its identity. A verified
 * sender, and a message with no verdict at all (this client's own, or
 * transcript backfill), get no badge.
 */
export const AuthorVerificationBadge = ({
  verificationState,
}: AuthorVerificationBadgeProps) => {
  switch (verificationState) {
    case PeerVerificationState.UNVERIFIED:
      return (
        <Tooltip title={unverifiedAuthorLabel}>
          <NoEncryptionIcon
            color="error"
            fontSize="inherit"
            sx={{ verticalAlign: 'middle', ml: 0.5 }}
          />
        </Tooltip>
      )

    case PeerVerificationState.VERIFYING:
      return (
        <Tooltip title={verifyingAuthorLabel}>
          <CircularProgress
            size={10}
            sx={{ verticalAlign: 'middle', ml: 0.5 }}
          />
        </Tooltip>
      )

    case PeerVerificationState.VERIFIED:
    case undefined:
      return null
  }
}
