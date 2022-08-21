import Typography from '@mui/material/Typography'

import { UnsentMessage, ReceivedMessage } from 'models/chat'

export interface ChatTranscriptProps {
  messageLog: Array<UnsentMessage | ReceivedMessage>
}

export const ChatTranscript = ({ messageLog }: ChatTranscriptProps) => {
  return (
    <div className="ChatTranscript flex flex-col">
      {messageLog.map((message, idx) => (
        <div className="block">
          <Typography
            key={`${idx}_${message}`}
            variant="body1"
            sx={{
              backgroundColor: 'primary.dark',
              margin: 0.5,
              padding: 1,
              borderRadius: 4,
              float: 'left',
            }}
          >
            {message.text}
          </Typography>
        </div>
      ))}
    </div>
  )
}
