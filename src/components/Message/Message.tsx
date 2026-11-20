import { HTMLAttributes } from 'react'
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import YouTube from 'react-youtube'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography, { TypographyProps } from '@mui/material/Typography'
import Link, { LinkProps } from '@mui/material/Link'
import styled from '@mui/material/styles/styled'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Markdown, { ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  InlineMedia as I_InlineMedia,
  Message as IMessage,
  isMessageReceived,
  isInlineMedia,
  PeerVerificationState,
} from 'core/models/chat'
import {
  PeerNameDisplay,
  SharedPeerNameBadge,
  peerFingerprintLabel,
} from 'components/PeerNameDisplay'
import { getPeerFingerprint } from 'core/names/peerNames'
import { CopyableBlock } from 'components/CopyableBlock/CopyableBlock'

import { AuthorVerificationBadge } from './AuthorVerificationBadge'
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
    target: '_blank',
    rel: 'noopener noreferrer',
  }),
  // https://github.com/remarkjs/react-markdown#use-custom-components-syntax-highlight
  code({
    node,
    className,
    children,
    style,
    ...props
  }: HTMLAttributes<HTMLElement> & ExtraProps) {
    const match = /language-(\w+)/.exec(className || '')

    return match ? (
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

  const authorVerificationState = isMessageReceived(message)
    ? message.authorVerificationState
    : undefined

  const isAuthorUnverified =
    authorVerificationState === PeerVerificationState.UNVERIFIED

  const isRelayed = isMessageReceived(message) && message.isRelayed === true

  const authorFingerprint = getPeerFingerprint(message.authorId)

  // Each bubble carries the cue, not just the author line its run shares.
  let outline = 'none'
  let outlineColor = 'transparent'

  if (isAuthorUnverified) {
    outline = '2px dashed'
    outlineColor = 'error.main'
  } else if (isRelayed) {
    outline = '1px dashed'
    outlineColor = 'warning.main'
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
          <Tooltip
            title={
              authorFingerprint === null
                ? ''
                : `${peerFingerprintLabel}: ${authorFingerprint}`
            }
          >
            {/* A Tooltip anchors to its child by ref, which PeerNameDisplay does not forward. */}
            <Box component="span">
              <PeerNameDisplay>{message.authorId}</PeerNameDisplay>
            </Box>
          </Tooltip>
          <SharedPeerNameBadge userId={message.authorId} />
          <AuthorVerificationBadge
            verificationState={authorVerificationState}
            isRelayed={isRelayed}
          />
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
            color:
              message.authorId === userId
                ? 'primary.contrastText'
                : 'secondary.contrastText',
            backgroundColor,
            margin: 0.5,
            padding: '0.5em 0.75em',
            borderRadius: 6,
            float: message.authorId === userId ? 'right' : 'left',
            transition: 'background-color 1s',
            wordBreak: 'break-word',
            outline,
            outlineColor,
          }}
          maxWidth="85%"
        >
          {isInlineMedia(message) ? (
            <InlineMedia
              magnetURI={message.magnetURI}
              fileKey={message.fileKey}
            />
          ) : isYouTubeLink(message) ? (
            <YouTube videoId={getYouTubeVideoId(message.text)} />
          ) : (
            <StyledMarkdown
              components={componentMap}
              remarkPlugins={[remarkGfm]}
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
