import {
  InlineMedia,
  isInlineMedia,
  isMessageReceived,
  Message,
  MessageLog,
  PeerVerificationState,
  ReceivedInlineMedia,
  ReceivedMessage,
} from 'core/models/chat'

export interface TranscriptLimitResult {
  /** The log trimmed to at most `limit` entries, keeping the most recent. */
  messageLog: MessageLog
  /** The entries that fell off the front, oldest first. */
  evicted: (Message | InlineMedia)[]
}

/**
 * Caps the transcript at `limit` entries.
 *
 * Callers need the evicted entries, not just the trimmed log: inline media that
 * scrolls out of the transcript is no longer reachable, so its torrent offer
 * should be rescinded rather than seeded forever.
 */
export const applyTranscriptLimit = (
  messages: MessageLog,
  limit: number
): TranscriptLimitResult => {
  if (messages.length <= limit) {
    return { messageLog: [...messages], evicted: [] }
  }

  // NOTE: Not `slice(-limit)` — `-0 === 0`, so a limit of zero would return the
  // whole log instead of none of it.
  const evictedCount = messages.length - limit

  return {
    messageLog: messages.slice(evictedCount),
    evicted: messages.slice(0, evictedCount),
  }
}

/** The magnet URIs of inline media among `messages`. */
export const getInlineMediaUris = (
  messages: readonly (Message | InlineMedia)[]
): string[] => messages.filter(isInlineMedia).map(({ magnetURI }) => magnetURI)

/**
 * Records the verdict on the author of messages that arrived while the
 * sender's identity check was still running.
 *
 * Only entries still marked VERIFYING are touched, and only those by
 * `authorId`: message ids are chosen by senders, so an id alone could name
 * another peer's message.
 */
export const settleAuthorVerification = (
  messages: MessageLog,
  {
    messageIds,
    authorId,
    verificationState,
  }: {
    messageIds: ReadonlySet<string>
    authorId: string
    verificationState: PeerVerificationState
  }
): MessageLog =>
  messages.map(message =>
    isMessageReceived(message) &&
    message.authorVerificationState === PeerVerificationState.VERIFYING &&
    message.authorId === authorId &&
    messageIds.has(message.id)
      ? { ...message, authorVerificationState: verificationState }
      : message
  )

/**
 * A received entry as it is sent to a peer: without what this client
 * concluded about its author or where the entry came from, which is this
 * client's alone to vouch for. The next peer reaches its own conclusions.
 */
export const withoutAuthorVerification = ({
  authorVerificationState: _authorVerificationState,
  isRelayed: _isRelayed,
  ...entry
}: ReceivedMessage | ReceivedInlineMedia):
  | ReceivedMessage
  | ReceivedInlineMedia => entry
