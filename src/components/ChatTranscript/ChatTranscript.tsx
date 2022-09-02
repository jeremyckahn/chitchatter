import { HTMLAttributes, useRef, useEffect } from 'react'
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
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const { current: boxEl } = boxRef
    if (!boxEl) return

    const { scrollHeight, clientHeight, scrollTop, children } = boxEl
    const scrollTopMax = scrollHeight - clientHeight

    if (children.length === 0) return

    const lastChild = children[children.length - 1]
    const lastChildHeight = lastChild.clientHeight
    const previousScrollTopMax = scrollTopMax - lastChildHeight

    if (
      Math.ceil(scrollTop) >= Math.ceil(previousScrollTopMax) &&
      // scrollTo is not defined in the unit test environment
      'scrollTo' in boxEl
    ) {
      boxEl.scrollTo({ top: scrollTopMax })
    }
  }, [messageLog.length])

  return (
    <Box
      ref={boxRef}
      className={cx('ChatTranscript', className)}
      sx={theme => ({
        display: 'flex',
        flexDirection: 'column',
        paddingTop: theme.spacing(1),
      })}
    >
      {messageLog.map(message => {
        return (
          // This wrapper div is necessary for accurate layout calculations
          // when new messages cause the transcript to scroll to the bottom.
          <div key={message.id}>
            <Message message={message} userId={userId} />
          </div>
        )
      })}
    </Box>
  )
}
