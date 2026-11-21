import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Tooltip from '@mui/material/Tooltip'

import { usePeerNameDisplay } from './usePeerNameDisplay'

export const sharedPeerNameLabel =
  'Someone else in this room has this same name. Names are not unique, so compare fingerprints to tell people apart.'

export interface SharedPeerNameBadgeProps {
  userId: string
}

/**
 * Warns that another user in the room shares `userId`'s generated name or
 * custom username: an accidental collision, or someone posing as them. Renders
 * nothing otherwise.
 */
export const SharedPeerNameBadge = ({ userId }: SharedPeerNameBadgeProps) => {
  const { isPeerNameShared } = usePeerNameDisplay()

  if (!isPeerNameShared(userId)) return null

  return (
    <Tooltip title={sharedPeerNameLabel}>
      <WarningAmberIcon
        color="warning"
        fontSize="inherit"
        sx={{ verticalAlign: 'middle', ml: 0.5 }}
      />
    </Tooltip>
  )
}
