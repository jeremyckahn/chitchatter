import { HTMLAttributes } from 'react'
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import YouTube from 'react-youtube'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography, { TypographyProps } from '@mui/material/Typography'
import Link, { LinkProps } from '@mui/material/Link'
import styled from '@mui/material/styles/styled'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Markdown from 'react-markdown'
import { CodeProps } from 'react-markdown/lib/ast-to-react'
import remarkGfm from 'remark-gfm'

import {
  InlineMedia as I_InlineMedia,
  Message as IMessage,
  isMessageReceived,
  isInlineMedia,
} from 'models/chat'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { CopyableBlock } from 'components/CopyableBlock/CopyableBlock'

import { InlineMedia } from './InlineMedia'

const StyledMarkdown = styled(Markdown)({})

export interface MessageProps {
  message: IMessage | I_InlineMedia
  showAuthor: boolean
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
      <CopyableBlock>
        <SyntaxHighlighter
          children={String(children).replace(/\n$/, '')}
          language={match[1]}
          style={materialDark}
          PreTag="div"
          {...props}
        />
      </CopyableBlock>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

const spaceNeededForSideDateTooltip = 850

const getYouTubeVideoId = (videoUrl: string) => {
  const trimmedMessage = videoUrl.trim()

  const matchArray =
    trimmedMessage.match(/https:\/\/www.youtube.com\/watch\?v=(\S{8,})$/) ||
    trimmedMessage.match(/https:\/\/youtu.be\/(\S{8,})$/)

  return matchArray?.pop()
}

const isYouTubeLink = (message: IMessage) => {
  return typeof getYouTubeVideoId(message.text) === 'string'
}

export const Message = ({ message, showAuthor, userId }: MessageProps) => {
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
      {showAuthor && (
        <Typography
          variant="caption"
          display="block"
          sx={{
            textAlign: message.authorId === userId ? 'right' : 'left',
          }}
        >
          <PeerNameDisplay>{message.authorId}</PeerNameDisplay>
        </Typography>
      )}
      <Tooltip
        placement={
          window.innerWidth >= spaceNeededForSideDateTooltip ? 'left' : 'top'
        }
        title={String(
          Intl.DateTimeFormat(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(message.timeSent)
        )}
      >
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
          {isInlineMedia(message) ? (
            <InlineMedia magnetURI={message.magnetURI} />
          ) : isYouTubeLink(message) ? (
            <YouTube videoId={getYouTubeVideoId(message.text)} />
          ) : (
            <StyledMarkdown
              components={componentMap}
              remarkPlugins={[remarkGfm]}
              linkTarget="_blank"
              sx={{
                '& pre': {
                  overflow: 'auto',
                },
                '& ol': {
                  pl: 2,
                  listStyleType: 'decimal',
                },
                '& ul': {
                  pl: 2,
                  listStyleType: 'disc',
                },
              }}
            >
              {message.text}
            </StyledMarkdown>
          )}
        </Box>
      </Tooltip>
    </Box>
  )
}
