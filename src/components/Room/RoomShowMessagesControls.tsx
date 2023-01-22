import { useContext } from 'react'

import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import { Comment, CommentsDisabled } from '@mui/icons-material'
import { Badge, Box } from '@mui/material'

import { RoomContext } from 'contexts/RoomContext'

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
        <Fab
          color="info"
          aria-label="show messages"
          onClick={() => setIsShowingMessages(!isShowingMessages)}
        >
          {isShowingMessages ? (
            <CommentsDisabled />
          ) : (
            <Badge color="error" badgeContent={unreadMessages}>
              <Comment />
            </Badge>
          )}
        </Fab>
      </Tooltip>
    </Box>
  )
}
