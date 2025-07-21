import React, { useState } from 'react'
import Typography, { TypographyProps } from '@mui/material/Typography'

import { usePeerNameDisplay } from './usePeerNameDisplay'

export interface PeerNameDisplayProps extends TypographyProps {
  children: string // userId
  showUserId?: boolean // Only show full/shortened user ID on Home page
}

export const PeerNameDisplay = ({
  children: userId,
  showUserId = false,
  ...rest
}: PeerNameDisplayProps) => {
  const { getFriendlyName, getShortenedUserId } = usePeerNameDisplay()
  const [isFullIdVisible, setIsFullIdVisible] = useState(false) // State for toggling full/shortened userId

  // Toggle full/shortened userId
  const handleToggleUserId = () => {
    setIsFullIdVisible(prev => !prev)
  }

  // If custom username is the same as the friendly name, display the friendly name

  return (
    <Typography
      component="span"
      {...rest}
      onClick={showUserId ? handleToggleUserId : undefined}
      style={{ cursor: showUserId ? 'pointer' : 'inherit' }}
    >
      {getFriendlyName(userId)}
      {showUserId && (
        <Typography variant="caption" component="span" {...rest}>
          {' '}
          ({isFullIdVisible ? userId : getShortenedUserId(userId)})
        </Typography>
      )}
    </Typography>
  )
}
