import Typography from '@mui/material/Typography'

import { UnsentMessage, ReceivedMessage } from 'models/chat'

export interface ChatTranscriptProps {
  messageLog: Array<UnsentMessage | ReceivedMessage>
}

export const ChatTranscript = ({ messageLog }: ChatTranscriptProps) => {
  return (
    <div className="ChatTranscript">
      {messageLog.map((message, idx) => (
        <Typography key={`${idx}_${message}`}>{message.text}</Typography>
      ))}
    </div>
  )
}
