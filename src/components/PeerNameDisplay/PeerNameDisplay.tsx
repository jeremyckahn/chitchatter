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
  const { getFriendlyName } = usePeerNameDisplay()
  const [isFullIdVisible, setIsFullIdVisible] = useState(false) // State for toggling full/shortened userId

  // Shortened version of userId
  const shortId = (id: string) => `${id.slice(0, 4)}...${id.slice(-3)}`

  // Toggle full/shortened userId
  const handleToggleUserId = () => {
    setIsFullIdVisible(prev => !prev)
  }

  // If custom username is the same as the friendly name, display the friendly name

  return (
    <Typography
      component="span"
      {...rest}
      onClick={handleToggleUserId}
      style={{ cursor: 'pointer' }}
    >
      {getFriendlyName(userId)}
      {showUserId && (
        <Typography variant="caption" component="span" {...rest}>
          {' '}
          ({isFullIdVisible ? userId : shortId(userId)})
        </Typography>
      )}
    </Typography>
  )
}
