import { Message as IMessage } from 'models/chat'
import { Message } from 'components/Message'

export interface ChatTranscriptProps {
  messageLog: Array<IMessage>
  userId: string
}

export const ChatTranscript = ({ messageLog, userId }: ChatTranscriptProps) => {
  return (
    <div className="ChatTranscript flex flex-col">
      {messageLog.map(message => {
        return <Message key={message.id} message={message} userId={userId} />
      })}
    </div>
  )
}
