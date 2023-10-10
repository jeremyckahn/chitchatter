import { useContext } from 'react'

import Tooltip from '@mui/material/Tooltip'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import { Comment, CommentsDisabled } from '@mui/icons-material'

import { RoomContext } from 'contexts/RoomContext'

import { MediaButton } from './MediaButton'

export function RoomShowMessagesControls() {
  const { isShowingMessages, setIsShowingMessages, unreadMessages } =
    useContext(RoomContext)

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: 1,
      }}
    >
      <Tooltip title={isShowingMessages ? 'Hide messages' : 'Show messages'}>
        <MediaButton
          isActive={isShowingMessages}
          aria-label="show messages"
          onClick={() => setIsShowingMessages(!isShowingMessages)}
        >
          <Badge color="error" badgeContent={unreadMessages}>
            {isShowingMessages ? <Comment /> : <CommentsDisabled />}
          </Badge>
        </MediaButton>
      </Tooltip>
    </Box>
  )
}
