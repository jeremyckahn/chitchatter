import Typography from '@mui/material/Typography'

import { Message as IMessage, isMessageReceived } from 'models/chat'

export interface MessageProps {
  message: IMessage
  userId: string
}

export const Message = ({ message, userId }: MessageProps) => {
  let backgroundColor: string

  if (message.authorId === userId) {
    backgroundColor = isMessageReceived(message)
      ? 'primary.dark'
      : 'primary.main'
  } else {
    backgroundColor = 'grey.700'
  }

  return (
    <div className="Message block">
      <Typography
        variant="body1"
        sx={{
          backgroundColor,
          margin: 0.5,
          padding: 1,
          borderRadius: 6,
          float: message.authorId === userId ? 'right' : 'left',
          transition: 'background-color 1s',
          wordBreak: 'break-all',
        }}
      >
        {message.text}
      </Typography>
    </div>
  )
}
