import { messageCharacterSizeLimit } from 'core/config/messaging'
import { isSafeMagnetUri } from 'core/chat/magnetUri'
import {
  ReceivedInlineMedia,
  ReceivedMessage,
  UnsentInlineMedia,
  UnsentMessage,
} from 'core/models/chat'

/**
 * Narrowing of what peers send into the shapes the rest of the core trusts.
 *
 * A peer is a stranger with a keyboard: every frame it sends arrives as
 * `unknown`, and nothing downstream may see a field this module did not check.
 * Each parser therefore builds a *new* object out of the fields it validated
 * instead of passing the received one on, which is what stops an extra field
 * (a smuggled `magnetURI` turns a text message into a download) coming along.
 *
 * What this cannot do is say whether a well-formed message is *true*. Messages
 * are not signed, so who wrote one, when, and whether it was ever sent are all
 * the sender's say-so. See the notes on `ChatRoom.handleTranscript`.
 */

/** User ids and message ids are UUIDs; this leaves room without inviting abuse. */
export const identifierMaxLength = 256

/** The most milliseconds from the epoch a `Date`, and so a timestamp, can hold. */
const maxTimestampMagnitude = 8.64e15

type UnknownRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isIdentifier = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= identifierMaxLength

/**
 * A timestamp the renderer can format. `Intl.DateTimeFormat` throws a
 * `RangeError` for anything outside the `Date` range and for `NaN`, which would
 * blank the transcript of everyone who received it.
 */
const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value) <= maxTimestampMagnitude

const isMessageText = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= messageCharacterSizeLimit

type Envelope = Pick<UnsentMessage, 'id' | 'timeSent' | 'authorId'>

const parseEnvelope = (record: UnknownRecord): Envelope | null => {
  const { id, timeSent, authorId } = record

  if (!isIdentifier(id) || !isIdentifier(authorId) || !isTimestamp(timeSent)) {
    return null
  }

  return { id, timeSent, authorId }
}

/** A text message, or `null` if `value` is not exactly one. */
export const parseUnsentMessage = (value: unknown): UnsentMessage | null => {
  if (!isRecord(value)) return null

  const envelope = parseEnvelope(value)
  const { text } = value

  if (!envelope || !isMessageText(text)) return null

  return { ...envelope, text }
}

/** An inline-media message, or `null` if `value` is not exactly one. */
export const parseUnsentInlineMedia = (
  value: unknown
): UnsentInlineMedia | null => {
  if (!isRecord(value)) return null

  const envelope = parseEnvelope(value)
  const { magnetURI } = value

  if (!envelope || !isSafeMagnetUri(magnetURI)) return null

  return { ...envelope, magnetURI }
}

/**
 * One transcript entry. The wire has no tag saying which kind it is, so the
 * fields decide, as they do for `isInlineMedia`: an entry that is both a text
 * message and a media message is ambiguous, and an honest peer never sends one.
 */
const parseTranscriptEntry = (
  value: unknown,
  receivedAt: number
): ReceivedMessage | ReceivedInlineMedia | null => {
  if (!isRecord(value)) return null

  const hasMagnet = 'magnetURI' in value
  const hasText = 'text' in value

  if (hasMagnet === hasText) return null

  const parsed = hasMagnet
    ? parseUnsentInlineMedia(value)
    : parseUnsentMessage(value)

  // Stamped here rather than carried over: `timeReceived` is when *this* client
  // got the entry, which is not something a sender can know.
  return parsed && { ...parsed, timeReceived: receivedAt }
}

export interface ParsedTranscript {
  /** The valid entries, oldest first, at most `limit` of them. */
  messageLog: Array<ReceivedMessage | ReceivedInlineMedia>
  /** How many entries were discarded: invalid, duplicate or beyond the limit. */
  discardedCount: number
}

/**
 * Narrows a received transcript to at most the `limit` most recent entries that
 * are well formed and unique by id, or `null` if it is not a list at all.
 *
 * The cut happens before any entry is looked at, so the work done on a
 * transcript is bounded by `limit` however long the sender made it.
 */
export const parseTranscript = (
  value: unknown,
  { limit, receivedAt }: { limit: number; receivedAt: number }
): ParsedTranscript | null => {
  if (!Array.isArray(value)) return null

  // `Array.isArray` narrows `unknown` to `any[]`; keep that from spreading.
  const received: readonly unknown[] = value
  const candidates = received.slice(Math.max(received.length - limit, 0))

  const seenIds = new Set<string>()
  const messageLog: ParsedTranscript['messageLog'] = []

  for (const candidate of candidates) {
    const entry = parseTranscriptEntry(candidate, receivedAt)

    if (!entry || seenIds.has(entry.id)) continue

    seenIds.add(entry.id)
    messageLog.push(entry)
  }

  return {
    messageLog,
    discardedCount: received.length - messageLog.length,
  }
}
