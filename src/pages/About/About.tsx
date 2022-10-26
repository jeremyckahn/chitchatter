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

##### Community rooms

There is [a public list of community rooms](https://github.com/jeremyckahn/chitchatter/wiki/Chitchatter-Community-Rooms) that you can join to discuss various topics.

##### Conversation backfilling

Conversation transcripts are erased from local memory as soon as you close the page or navigate away from the room. Conversations are only ever held in volatile memory and never persisted to any disk by Chitchatter.

When a peer joins a public room with participants already in it, the new peer will automatically request the transcript of the conversation that has already taken place from the other peers. Once all peers leave the room, the conversation is completely erased.

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
