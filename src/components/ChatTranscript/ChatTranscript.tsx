import Typography from '@mui/material/Typography'

import { UnsentMessage, ReceivedMessage } from 'models/chat'

export interface ChatTranscriptProps {
  messageLog: Array<UnsentMessage | ReceivedMessage>
  userId: string
}

export const ChatTranscript = ({ messageLog, userId }: ChatTranscriptProps) => {
  return (
    <div className="ChatTranscript flex flex-col">
      {messageLog.map((message, idx) => (
        <div className="block">
          <Typography
            key={`${idx}_${message}`}
            variant="body1"
            sx={{
              backgroundColor:
                message.authorId === userId ? 'primary.dark' : 'grey.700',
              margin: 0.5,
              padding: 1,
              borderRadius: 4,
              float: message.authorId === userId ? 'right' : 'left',
            }}
          >
            {message.text}
          </Typography>
        </div>
      ))}
    </div>
  )
}
