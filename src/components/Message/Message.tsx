import { HTMLAttributes } from 'react'
import Box from '@mui/material/Box'
import Typography, { TypographyProps } from '@mui/material/Typography'
import Link, { LinkProps } from '@mui/material/Link'
import Markdown from 'react-markdown'
import { CodeProps } from 'react-markdown/lib/ast-to-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

import { Message as IMessage, isMessageReceived } from 'models/chat'
import { PeerNameDisplay } from 'components/PeerNameDisplay'

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
    color: 'primary.contrastText',
  }),
  // https://github.com/remarkjs/react-markdown#use-custom-components-syntax-highlight
  code({ node, inline, className, children, style, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <SyntaxHighlighter
        children={String(children).replace(/\n$/, '')}
        language={match[1]}
        style={materialDark}
        PreTag="div"
        {...props}
      />
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

export const Message = ({ message, userId }: MessageProps) => {
  let backgroundColor: string

  if (message.authorId === userId) {
    backgroundColor = isMessageReceived(message)
      ? 'primary.main'
      : 'primary.light'
  } else {
    backgroundColor = 'secondary.main'
  }

  return (
    <Box className="Message">
      <Typography
        variant="caption"
        display="block"
        sx={{
          textAlign: message.authorId === userId ? 'right' : 'left',
        }}
      >
        <PeerNameDisplay>{message.authorId}</PeerNameDisplay>
      </Typography>
      <Box
        sx={{
          color: 'primary.contrastText',
          backgroundColor,
          margin: 0.5,
          padding: '0.5em 0.75em',
          borderRadius: 6,
          float: message.authorId === userId ? 'right' : 'left',
          transition: 'background-color 1s',
          wordBreak: 'break-word',
        }}
        maxWidth="85%"
      >
        <Markdown
          components={componentMap}
          remarkPlugins={[remarkGfm]}
          linkTarget="_blank"
        >
          {message.text}
        </Markdown>
      </Box>
    </Box>
  )
}
