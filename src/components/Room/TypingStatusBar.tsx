import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ChatRoom } from 'core/chat/ChatRoom'
import { useChatRoomPeers } from 'hooks/useChatRoomState'
import {
  PeerNameDisplay,
  PeerNameDisplayProps,
} from 'components/PeerNameDisplay/PeerNameDisplay'

export const TypingStatusBar = ({
  chatRoom,
  isDirectMessageRoom,
}: {
  chatRoom: ChatRoom
  isDirectMessageRoom: boolean
}) => {
  // Read from the room being displayed rather than from the shell's peer list,
  // which only ever holds the group room's peers: a direct-message room tracks
  // its correspondent's typing status in its own peer list.
  const peerList = useChatRoomPeers(chatRoom)

  const typingPeers = peerList.filter(
    ({ isTypingGroupMessage, isTypingDirectMessage }) =>
      isDirectMessageRoom ? isTypingDirectMessage : isTypingGroupMessage
  )

  const peerNameDisplayProps: Partial<PeerNameDisplayProps> = {
    variant: 'caption',
    sx: theme => ({
      color: theme.palette.text.secondary,
      fontWeight: theme.typography.fontWeightBold,
    }),
  }

  let statusMessage = <></>

  if (typingPeers.length === 1) {
    statusMessage = (
      <>
        <PeerNameDisplay {...peerNameDisplayProps}>
          {typingPeers[0].userId}
        </PeerNameDisplay>{' '}
        is typing...
      </>
    )
  } else if (typingPeers.length === 2) {
    statusMessage = (
      <>
        <PeerNameDisplay {...peerNameDisplayProps}>
          {typingPeers[0].userId}
        </PeerNameDisplay>{' '}
        and{' '}
        <PeerNameDisplay {...peerNameDisplayProps}>
          {typingPeers[1].userId}
        </PeerNameDisplay>{' '}
        are typing...
      </>
    )
  } else if (typingPeers.length > 2) {
    statusMessage = <>Several people are typing...</>
  }

  return (
    <Box>
      <Typography
        variant="caption"
        sx={theme => ({
          color: theme.palette.text.secondary,
          display: 'block',
          fontWeight: theme.typography.fontWeightBold,
          height: '1.75rem',
          maxHeight: '1.75rem',
          overflow: 'hidden',
          px: 2,
          py: 0.5,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        })}
      >
        {statusMessage}
      </Typography>
    </Box>
  )
}
