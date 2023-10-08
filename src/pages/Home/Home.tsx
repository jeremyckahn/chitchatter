import React, { useEffect, useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MuiLink from '@mui/material/Link'
import GitHubIcon from '@mui/icons-material/GitHub'
import Cached from '@mui/icons-material/Cached'
import Dialog from '@mui/material/Dialog'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { v4 as uuid } from 'uuid'
// These imports need to be ts-ignored to prevent spurious errors that look
// like this:
//
//   Module 'react-markdown' cannot be imported using this construct. The
//   specifier only resolves to an ES module, which cannot be imported
//   synchronously. Use dynamic import instead. (tsserver 1471)
//
// @ts-ignore
import Markdown from 'react-markdown'
// @ts-ignore
import { CodeProps } from 'react-markdown/lib/ast-to-react'
// @ts-ignore
import remarkGfm from 'remark-gfm'

import { routes } from 'config/routes'
import { ShellContext } from 'contexts/ShellContext'
import { PeerNameDisplay } from 'components/PeerNameDisplay'
import { ReactComponent as Logo } from 'img/logo.svg'

interface HomeProps {
  userId: string
}

export function Home({ userId }: HomeProps) {
  const { setTitle } = useContext(ShellContext)
  const [roomName, setRoomName] = useState(uuid())
  const [showEmbedCode, setShowEmbedCode] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setTitle('Chitchatter')
  }, [setTitle])

  const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setRoomName(value)
  }

  const handleFormSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  const handleJoinPublicRoomClick = () => {
    navigate(`/public/${roomName}`)
  }

  const handleJoinPrivateRoomClick = () => {
    navigate(`/private/${roomName}`)
  }

  const handleGetEmbedCodeClick = () => {
    setShowEmbedCode(true)
  }

  const handleEmbedCodeWindowClose = () => {
    setShowEmbedCode(false)
  }

  const isRoomNameValid = roomName.length > 0

  const embedUrl = new URL(`${window.location.origin}/public/${roomName}`)
  embedUrl.search = new URLSearchParams({ embed: '1' }).toString()

  return (
    <Box className="Home">
      <main className="mt-6 px-4 max-w-3xl text-center mx-auto">
        <Link to={routes.ABOUT}>
          <Logo className="px-1 pb-4 mx-auto max-w-md" />
        </Link>
        <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto">
          <Typography sx={{ mb: 2 }}>
            Your username:{' '}
            <PeerNameDisplay paragraph={false} sx={{ fontWeight: 'bold' }}>
              {userId}
            </PeerNameDisplay>
          </Typography>
          <FormControl fullWidth>
            <TextField
              label="Room name (generated client-side)"
              variant="outlined"
              value={roomName}
              onChange={handleRoomNameChange}
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label="Regenerate room id"
                    onClick={() => setRoomName(uuid())}
                    size="small"
                  >
                    <Cached />
                  </IconButton>
                ),
                sx: { fontSize: { xs: '0.9rem', sm: '1rem' } },
              }}
              size="medium"
            />
          </FormControl>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="contained"
              onClick={handleJoinPublicRoomClick}
              sx={{
                marginTop: 2,
              }}
              disabled={!isRoomNameValid}
            >
              Join public room
            </Button>
            <Button
              variant="contained"
              onClick={handleJoinPrivateRoomClick}
              sx={{
                marginTop: 2,
                marginLeft: 2,
              }}
              disabled={!isRoomNameValid}
            >
              Join private room
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleGetEmbedCodeClick}
              sx={{
                marginTop: 2,
                marginLeft: 2,
              }}
              disabled={!isRoomNameValid}
            >
              Get embed code
            </Button>
          </Box>
        </form>
      </main>
      <Divider sx={{ my: 2 }} />
      <Box className="max-w-3xl text-center mx-auto px-4">
        <Typography variant="body1">
          This is a free communication tool that is designed for simplicity,
          privacy, and security. All interaction between you and your online
          peers is encrypted. There is no record of your conversation once you
          all leave.
        </Typography>
      </Box>
      <Box
        sx={{
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <MuiLink
          href="https://github.com/jeremyckahn/chitchatter"
          target="_blank"
          sx={theme => ({
            color: theme.palette.text.primary,
          })}
        >
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="Open menu"
          >
            <GitHubIcon sx={{ fontSize: '2em' }} />
          </IconButton>
        </MuiLink>
      </Box>
      <Typography variant="body1" sx={{ textAlign: 'center' }}>
        Licensed under{' '}
        <MuiLink
          href="https://github.com/jeremyckahn/chitchatter/blob/develop/LICENSE"
          target="_blank"
        >
          GPL v2
        </MuiLink>
        . Please{' '}
        <MuiLink
          href="https://github.com/jeremyckahn/chitchatter/blob/develop/README.md"
          target="_blank"
        >
          read the docs
        </MuiLink>
        .
      </Typography>
      <Dialog open={showEmbedCode} onClose={handleEmbedCodeWindowClose}>
        <DialogTitle>Room embed code</DialogTitle>
        <DialogContent>
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              // https://github.com/remarkjs/react-markdown#use-custom-components-syntax-highlight
              code({
                node,
                inline,
                className,
                children,
                style,
                ...props
              }: CodeProps) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, '')}
                    language="html"
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
            }}
          >
            {`\`\`\`html
<iframe src="${embedUrl}" allow="camera;microphone;display-capture" width="800" height="800" />
\`\`\``}
          </Markdown>
          <DialogContentText sx={{ mb: 2 }}>
            Copy and paste this HTML snippet into your project.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEmbedCodeWindowClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
