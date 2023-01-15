import { useContext } from 'react'

import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import { Comment, CommentsDisabled } from '@mui/icons-material'
import { Badge } from '@mui/material'

import { RoomContext } from 'contexts/RoomContext'

export function RoomShowMessagesControls() {
  const { isShowingMessages, setIsShowingMessages, unreadMessages } =
    useContext(RoomContext)

  return (
    <Tooltip title={isShowingMessages ? 'Hide messages' : 'Show messages'}>
      <Fab
        color={isShowingMessages ? 'inherit' : 'success'}
        aria-label="show messages"
        onClick={() => setIsShowingMessages(!isShowingMessages)}
      >
        {isShowingMessages ? (
          <CommentsDisabled />
        ) : unreadMessages ? (
          <Badge color="error" badgeContent={unreadMessages}>
            <Comment />
          </Badge>
        ) : (
          <Comment />
        )}
      </Fab>
    </Tooltip>
  )
}
