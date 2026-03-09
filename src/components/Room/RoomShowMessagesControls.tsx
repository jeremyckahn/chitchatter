import { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import Tooltip from '@mui/material/Tooltip'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import { Comment, CommentsDisabled } from '@mui/icons-material'

import { RoomContext } from 'contexts/RoomContext'

import { MediaButton } from './MediaButton'

export function RoomShowMessagesControls() {
  const { t } = useTranslation()
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
      <Tooltip
        title={
          isShowingMessages
            ? t('roomControls.hideMessages')
            : t('roomControls.showMessages')
        }
      >
        <MediaButton
          isActive={isShowingMessages}
          aria-label={t('roomControls.showMessagesLabel')}
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
