import Box from '@mui/material/Box'
import { Typography } from '@mui/material'
import { useContext } from 'react'
import { ShellContext } from 'contexts/ShellContext'
import {
  PeerNameDisplay,
  PeerNameDisplayProps,
} from 'components/PeerNameDisplay/PeerNameDisplay'

export const TypingStatusBar = () => {
  const { peerList } = useContext(ShellContext)
  const typingPeers = peerList.filter(({ isTyping }) => isTyping)

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
          display: 'block',
          px: 2,
          py: 0.5,
          color: theme.palette.text.secondary,
          fontWeight: theme.typography.fontWeightBold,
          textOverflow: 'ellipsis',
        })}
      >
        {statusMessage}
        {/*
        This span acts a spacer that causes the bar to take up a consistent
        amount of space.
        */}
        <span style={{ userSelect: 'none' }}>&nbsp;</span>
      </Typography>
    </Box>
  )
}
