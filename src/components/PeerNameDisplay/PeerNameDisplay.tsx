import Typography, { TypographyProps } from '@mui/material/Typography'

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
  const [isFullIdVisible, setIsFullIdVisible] = useState(false) // State để quản lý việc hiển thị ID đầy đủ

  const { getCustomUsername, getFriendlyName, getShortenedUserId } =
    usePeerNameDisplay()

  const friendlyName = getFriendlyName(userId)
  const customUsername = getCustomUsername(userId)

  // Lấy ID người dùng rút gọn
  const shortUserId = getShortenedUserId(userId)

  // Hàm chuyển đổi giữa ID đầy đủ và ID rút gọn khi nhấp vào
  const toggleFullIdVisibility = () => {
    setIsFullIdVisible(!isFullIdVisible)
  }

  return (
    <div>
      {/* Hiển thị tên người dùng */}
      <Typography
        component="span"
        {...rest}
        style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
      >
        {customUsername === friendlyName ? friendlyName : getPeerName(userId)}
      </Typography>

      {/* Hiển thị "User ID" */}
      <Typography
        variant="caption"
        {...rest}
        style={{
          display: 'block',
          fontSize: '1rem',
          marginTop: '8px',
          fontWeight: 'normal',
        }}
      >
        User ID:
      </Typography>

      {/* Hiển thị ID người dùng */}
      <Typography
        variant="caption"
        {...rest}
        style={{
          display: 'block',
          cursor: 'pointer',
          fontSize: '1.2rem',
          fontWeight: 'bold',
        }}
        onClick={toggleFullIdVisibility}
      >
        {/* Hiển thị ID rút gọn hoặc đầy đủ tùy vào trạng thái */}
        {isFullIdVisible ? userId : shortUserId}
      </Typography>
    </div>
  )
}
