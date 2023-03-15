import { HTMLAttributes, useRef, useEffect, useState } from 'react'
import cx from 'classnames'
import Box from '@mui/material/Box'

import { Message as IMessage, InlineMedia } from 'models/chat'
import { Message } from 'components/Message'

export interface ChatTranscriptProps extends HTMLAttributes<HTMLDivElement> {
  messageLog: Array<IMessage | InlineMedia>
  userId: string
}

export const ChatTranscript = ({
  className,
  messageLog,
  userId,
}: ChatTranscriptProps) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const [previousMessageLogLength, setPreviousMessageLogLength] = useState(0)

  useEffect(() => {
    const { current: boxEl } = boxRef
    if (!boxEl) return

    const { scrollHeight, clientHeight, scrollTop, children } = boxEl
    const scrollTopMax = scrollHeight - clientHeight

    if (children.length === 0) return

    const lastChild = children[children.length - 1]
    const lastChildHeight = lastChild.clientHeight
    const previousScrollTopMax = scrollTopMax - lastChildHeight

    // Accounts for rounding errors in layout calculations
    const marginBuffer = 1

    const wasPreviouslyScrolledToBottom =
      Math.ceil(scrollTop) >= Math.ceil(previousScrollTopMax) - marginBuffer
    const wasMessageLogPreviouslyEmpty = previousMessageLogLength === 0
    const shouldScrollToLatestMessage =
      wasPreviouslyScrolledToBottom || wasMessageLogPreviouslyEmpty

    if (
      shouldScrollToLatestMessage &&
      // scrollTo is not defined in the unit test environment
      'scrollTo' in boxEl
    ) {
      boxEl.scrollTo({ top: scrollTopMax })
    }
  }, [messageLog, previousMessageLogLength])

  useEffect(() => {
    setPreviousMessageLogLength(messageLog.length)
  }, [messageLog.length])

  return (
    <Box
      ref={boxRef}
      className={cx('ChatTranscript', className)}
      sx={theme => ({
        display: 'flex',
        flexDirection: 'column',
        mx: 'auto',
        paddingY: theme.spacing(1),
        width: '100%',
        maxWidth: theme.breakpoints.values.md,
      })}
    >
      {messageLog.map((message, idx) => {
        const previousMessage = messageLog[idx - 1]
        const isFirstMessageInGroup =
          previousMessage?.authorId !== message.authorId

        return (
          // This wrapper div is necessary for accurate layout calculations
          // when new messages cause the transcript to scroll to the bottom.
          <div key={message.id}>
            <Message
              message={message}
              userId={userId}
              showAuthor={isFirstMessageInGroup}
            />
          </div>
        )
      })}
    </Box>
  )
}
