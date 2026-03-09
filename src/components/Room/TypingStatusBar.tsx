import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ShellContext } from 'contexts/ShellContext'
import {
  PeerNameDisplay,
  PeerNameDisplayProps,
} from 'components/PeerNameDisplay/PeerNameDisplay'

export const TypingStatusBar = ({
  isDirectMessageRoom,
}: {
  isDirectMessageRoom: boolean
}) => {
  const { t } = useTranslation()
  const { peerList } = useContext(ShellContext)
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
        {t('room.isTyping')}
      </>
    )
  } else if (typingPeers.length === 2) {
    statusMessage = (
      <>
        <PeerNameDisplay {...peerNameDisplayProps}>
          {typingPeers[0].userId}
        </PeerNameDisplay>{' '}
        {t('room.andTyping')}{' '}
        <PeerNameDisplay {...peerNameDisplayProps}>
          {typingPeers[1].userId}
        </PeerNameDisplay>{' '}
        {t('room.areTyping')}
      </>
    )
  } else if (typingPeers.length > 2) {
    statusMessage = <>{t('room.severalTyping')}</>
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
