import { useContext, useEffect } from 'react'
import MuiMarkdown from 'mui-markdown'
import Box from '@mui/material/Box'
import useTheme from '@mui/material/styles/useTheme'

import { ShellContext } from 'contexts/ShellContext'
import {
  messageTranscriptSizeLimit,
  messageCharacterSizeLimit,
} from 'config/messaging'

const messageTranscriptSizeLimitFormatted = Intl.NumberFormat().format(
  messageTranscriptSizeLimit
)

const messageCharacterSizeLimitFormatted = Intl.NumberFormat().format(
  messageCharacterSizeLimit
)

export const About = () => {
  const { setTitle } = useContext(ShellContext)
  const theme = useTheme()

  useEffect(() => {
    setTitle('About')
  }, [setTitle])

  return (
    <Box
      className="About"
      sx={{
        p: 2,
        mx: 'auto',
        maxWidth: theme.breakpoints.values.md,
        '& p': {
          mb: 2,
        },
      }}
    >
      <MuiMarkdown>
        {`
### User Guide

Chitchatter is a communication tool designed to make secure and private communication accessible to all. Please [see the README](https://github.com/jeremyckahn/chitchatter/blob/develop/README.md) for full project documentation.

#### Chat rooms

Public rooms can be joined by **anyone** with the room URL. By default, rooms are given a random and unguessable name. You can name your room whatever you'd like, but keep in mind that simpler room names are more guessable by others. For maximum security, consider using the default room name.

Private rooms can only be joined by peers with a matching password. The password must be mutually agreed upon before joining. If peers submit mismatching passwords, they will be in the room but be unable to connect to each other. **No error will be shown** if there is a password mismatch because there is no central arbitrating mechanism by which to detect the mismatch.

To connect to others, share the room URL with a secure tool such as [Burner Note](https://burnernote.com/) or [Yopass](https://yopass.se/). You will be notified when others join the room.

##### Peer verification

When you connect with a peer, Chitchatter automatically attempts to use [public-key cryptography](https://en.wikipedia.org/wiki/Public-key_cryptography) to verify them. You can see everyone's public keys in the peer list. Feel free to share your public key with others (it is not sensitive information) so that they can uniquely identify you.

All public and private keys are generated locally. Your private key is never sent to any peer or server.

##### Community rooms

There is [a public list of community rooms](https://github.com/jeremyckahn/chitchatter/wiki/Chitchatter-Community-Rooms) that you can join to discuss various topics.

##### Conversation backfilling

Conversation transcripts are erased from local memory as soon as you close the page or navigate away from the room. Conversations are only ever held in volatile memory and never persisted to any disk by Chitchatter.

When a peer joins a **public** room with participants already in it, the new peer will automatically request the transcript of the conversation that has already taken place from the other peers. Once all peers leave the room, the conversation is completely erased. Peers joining a **private** room will not get the conversation transcript backfilled.

Chat transcript history is limited to ${messageTranscriptSizeLimitFormatted} messages for all rooms.

#### Message Authoring

Chat messages support [GitHub-flavored Markdown](https://github.github.com/gfm/) with code syntax highlighting.

Press \`Enter\` to send a message. Press \`Shift + Enter\` to insert a line break. Message size is limited to ${messageCharacterSizeLimitFormatted} characters.
        `}
      </MuiMarkdown>
    </Box>
  )
}
