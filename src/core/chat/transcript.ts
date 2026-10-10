import {
  InlineMedia,
  isInlineMedia,
  Message,
  MessageLog,
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
