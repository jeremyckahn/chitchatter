import HistoryIcon from '@mui/icons-material/History'
import NoEncryptionIcon from '@mui/icons-material/NoEncryption'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'

import { PeerVerificationState } from 'core/models/chat'

export const unverifiedAuthorLabel =
  'The sender of this message could not be verified with public-key cryptography. They may be misrepresenting themself. Be careful with what you share.'

export const verifyingAuthorLabel = 'Attempting to verify the sender...'

export const relayedMessageLabel =
  'This message was sent before you joined, and another peer relayed it to you. Its sender cannot be verified, so it may not be from who it says. Be careful with what you share.'

export interface AuthorVerificationBadgeProps {
  verificationState: PeerVerificationState | undefined
  isRelayed: boolean
}

/**
 * Flags a message whose sender has not proven its identity: one from an
 * unverified sender, one whose sender is still being checked, and one relayed
 * by another peer, whose sender nothing can check. A verified sender and this
 * client's own messages get no badge.
 */
export const AuthorVerificationBadge = ({
  verificationState,
  isRelayed,
}: AuthorVerificationBadgeProps) => {
  if (isRelayed) {
    return (
      <Tooltip title={relayedMessageLabel}>
        <HistoryIcon
          color="warning"
          fontSize="inherit"
          sx={{ verticalAlign: 'middle', ml: 0.5 }}
        />
      </Tooltip>
    )
  }

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
