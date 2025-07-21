import Typography, { TypographyProps } from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useState } from 'react'

import { usePeerNameDisplay } from './usePeerNameDisplay'
import { getPeerName } from './getPeerName'

export interface PeerNameDisplayProps extends TypographyProps {
  children: string // userId
}

export const PeerNameDisplay = ({
  children: userId,
  ...rest
}: PeerNameDisplayProps) => {
  const [isFullIdVisible, setIsFullIdVisible] = useState(false)

  const { getCustomUsername, getFriendlyName, getShortenedUserId } =
    usePeerNameDisplay()

  const friendlyName = getFriendlyName(userId)
  const customUsername = getCustomUsername(userId)
  const shortUserId = getShortenedUserId(userId)

  const displayName =
    customUsername === friendlyName ? friendlyName : getPeerName(userId)

  const isShortId = userId.length <= 12

  const toggleUserId = () => {
    if (!isShortId) {
      setIsFullIdVisible(prev => !prev)
    }
  }

  const displayUserId = isShortId
    ? userId
    : isFullIdVisible
      ? userId
      : shortUserId

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.875rem',
      }}
    >
      {/* Username */}
      <Typography
        component="span"
        variant="body2"
        sx={{ fontSize: 'inherit', fontWeight: 500 }}
        {...rest}
      >
        {displayName}
      </Typography>

      {/* User ID */}
      <Typography
        component="span"
        variant="caption"
        onClick={toggleUserId}
        sx={{
          fontSize: 'inherit',
          cursor: isShortId ? 'default' : 'pointer',
          userSelect: 'none',
        }}
        {...rest}
      >
        {'\u00A0'}({displayUserId})
      </Typography>
    </Box>
  )
}
