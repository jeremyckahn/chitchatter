import { useContext, useEffect } from 'react'
import MuiMarkdown from 'mui-markdown'
import Box from '@mui/material/Box'

import { ShellContext } from 'contexts/ShellContext'
import { messageCharacterSizeLimit } from 'config/messaging'

import './index.sass'

export const About = () => {
  const { setTitle } = useContext(ShellContext)

  useEffect(() => {
    setTitle('About')
  }, [setTitle])

  return (
    <Box className="About max-w-3xl mx-auto p-4">
      <MuiMarkdown>
        {`
### User Guide

Chitchatter is a communication tool designed to make secure and private communication accessible to all. Please [see the README](https://github.com/jeremyckahn/chitchatter/blob/develop/README.md) for full project documentation.

#### Chat rooms

Public rooms can be joined by **anyone** with the room URL. By default, rooms are given a random and un-guessable name. You can name your room whatever you'd like, but keep in mind that simpler room names are more guessable by others. For maximum security, consider using the default room name.

To connect to others, share the room URL with a secure tool such as [Burner Note](https://burnernote.com/) or [Yopass](https://yopass.se/). You will be notified when others join the room.

Chat message transcripts are erased as soon as you close the page or navigate away from the room.

#### Message Authoring

Chat messages support [GitHub-flavored Markdown](https://github.github.com/gfm/).

Press \`Enter\` to send a message. Press \`Shift + Enter\` to insert a line break. Message size is limited to ${Intl.NumberFormat().format(
          messageCharacterSizeLimit
        )} characters.
        `}
      </MuiMarkdown>
    </Box>
  )
}
