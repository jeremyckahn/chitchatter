import { HTMLAttributes } from 'react'
import cx from 'classnames'
import Box from '@mui/material/Box'

import { Message as IMessage } from 'models/chat'
import { Message } from 'components/Message'

export interface ChatTranscriptProps extends HTMLAttributes<HTMLDivElement> {
  messageLog: Array<IMessage>
  userId: string
}

export const ChatTranscript = ({
  className,
  messageLog,
  userId,
}: ChatTranscriptProps) => {
  return (
    <Box className={cx('ChatTranscript flex flex-col', className)}>
      {messageLog.map(message => {
        return <Message key={message.id} message={message} userId={userId} />
      })}
    </Box>
  )
}
