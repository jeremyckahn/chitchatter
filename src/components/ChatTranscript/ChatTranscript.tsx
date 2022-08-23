import Typography from '@mui/material/Typography'

import { isMessageReceived, UnsentMessage, ReceivedMessage } from 'models/chat'

export interface ChatTranscriptProps {
  messageLog: Array<UnsentMessage | ReceivedMessage>
  userId: string
}

export const ChatTranscript = ({ messageLog, userId }: ChatTranscriptProps) => {
  return (
    <div className="ChatTranscript flex flex-col">
      {messageLog.map(message => {
        let backgroundColor: string

        if (message.authorId === userId) {
          backgroundColor = isMessageReceived(message)
            ? 'primary.dark'
            : 'primary.main'
        } else {
          backgroundColor = 'grey.700'
        }

        return (
          <div className="block" key={message.id}>
            <Typography
              variant="body1"
              sx={{
                backgroundColor,
                margin: 0.5,
                padding: 1,
                borderRadius: 6,
                float: message.authorId === userId ? 'right' : 'left',
                transition: 'background-color 1s',
              }}
            >
              {message.text}
            </Typography>
          </div>
        )
      })}
    </div>
  )
}
