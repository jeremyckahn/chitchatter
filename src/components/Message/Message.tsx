import { HTMLAttributes } from 'react'
import Box from '@mui/material/Box'
import Typography, { TypographyProps } from '@mui/material/Typography'
import Link, { LinkProps } from '@mui/material/Link'
import Markdown from 'react-markdown'

import { Message as IMessage, isMessageReceived } from 'models/chat'

export interface MessageProps {
  message: IMessage
  userId: string
}

const typographyFactory =
  (overrides: TypographyProps) => (args: HTMLAttributes<HTMLElement>) => {
    return <Typography {...args} {...overrides} />
  }

const linkFactory =
  (overrides: LinkProps) => (args: HTMLAttributes<HTMLElement>) => {
    return <Link {...args} {...overrides} />
  }

const componentMap = {
  h1: typographyFactory({ variant: 'h1' }),
  h2: typographyFactory({ variant: 'h2' }),
  h3: typographyFactory({ variant: 'h3' }),
  h4: typographyFactory({ variant: 'h4' }),
  h5: typographyFactory({ variant: 'h5' }),
  h6: typographyFactory({ variant: 'h6' }),
  p: typographyFactory({ variant: 'body1' }),
  a: linkFactory({
    variant: 'body1',
    underline: 'always',
    color: 'primary.light',
  }),
}

export const Message = ({ message, userId }: MessageProps) => {
  let backgroundColor: string

  if (message.authorId === userId) {
    backgroundColor = isMessageReceived(message)
      ? 'primary.dark'
      : 'primary.main'
  } else {
    backgroundColor = 'grey.700'
  }

  return (
    <div className="Message block">
      <Box
        sx={{
          backgroundColor,
          margin: 0.5,
          padding: 1,
          borderRadius: 6,
          float: message.authorId === userId ? 'right' : 'left',
          transition: 'background-color 1s',
          wordBreak: 'break-all',
        }}
      >
        <Markdown components={componentMap} linkTarget="_blank">
          {message.text}
        </Markdown>
      </Box>
    </div>
  )
}
