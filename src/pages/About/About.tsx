import { useContext, useEffect } from 'react'
import Link from '@mui/material/Link'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'

import { messageCharacterSizeLimit } from 'config/messaging'
import { ShellContext } from 'contexts/ShellContext'

export const About = () => {
  const { setTitle } = useContext(ShellContext)

  useEffect(() => {
    setTitle('About')
  }, [setTitle])

  return (
    <Box className="max-w-3xl mx-auto p-4">
      <Typography sx={{ mb: 1 }}>
        Chitchatter is a communication tool designed to make secure and private
        communication accessible to all. Please{' '}
        <Link
          href="https://github.com/jeremyckahn/chitchatter/blob/develop/README.md"
          target="_blank"
        >
          see the README
        </Link>{' '}
        for full project documentation.
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h3.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 2,
        })}
      >
        User Guide
      </Typography>
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        })}
      >
        Chat rooms
      </Typography>
      <Typography sx={{ mb: 1 }}>
        Public rooms can be joined by <strong>anyone</strong> with the room URL.
        By default, rooms are given a random and un-guessable name. You can name
        your room whatever you'd like, but keep in mind that simpler room names
        are more guessable by others. For maximum security, consider using the
        default room name.
      </Typography>
      <Typography sx={{ mb: 1 }}>
        To connect to others, share the room URL with a secure tool such as{' '}
        <Link href="https://burnernote.com/" target="_blank">
          Burner Note
        </Link>{' '}
        or{' '}
        <Link href="https://yopass.se/" target="_blank">
          Yopass
        </Link>
        . You will be notified when others join the room.
      </Typography>
      <Typography sx={{ mb: 1 }}>
        Chat message transcripts are erased as soon as you close the page or
        navigate away from the room.
      </Typography>
      <Typography
        variant="h2"
        sx={theme => ({
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          mb: 1.5,
        })}
      >
        Message Authoring
      </Typography>
      <Typography sx={{ mb: 1 }}>
        Chat messages support{' '}
        <Link href="https://github.github.com/gfm/" target="_blank">
          GitHub-flavored Markdown
        </Link>
        .
      </Typography>
      <Typography sx={{ mb: 1 }}>
        Press <code>Enter</code> to send a message. Press{' '}
        <code>Shift + Enter</code> to insert a line break. Message size is
        limited to {messageCharacterSizeLimit.toLocaleString()} characters.
      </Typography>
    </Box>
  )
}
