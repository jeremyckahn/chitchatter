import { describe, expect, it } from 'vitest'

import { applyTranscriptLimit, getInlineMediaUris } from 'core/chat/transcript'
import { InlineMedia, Message, MessageLog } from 'core/models/chat'

const message = (id: string): Message => ({
  id,
  text: id,
  timeSent: 0,
  authorId: 'author',
})

const media = (id: string, magnetURI: string): InlineMedia => ({
  id,
  magnetURI,
  timeSent: 0,
  authorId: 'author',
})

describe('applyTranscriptLimit', () => {
  it('leaves a log shorter than the limit alone', () => {
    const messages: MessageLog = [message('a'), message('b')]
    const { messageLog, evicted } = applyTranscriptLimit(messages, 5)

    expect(messageLog).toEqual(messages)
    expect(evicted).toEqual([])
  })

  it('leaves a log exactly at the limit alone', () => {
    const messages: MessageLog = [message('a'), message('b')]
    const { messageLog, evicted } = applyTranscriptLimit(messages, 2)

    expect(messageLog).toEqual(messages)
    expect(evicted).toEqual([])
  })

  it('returns a copy rather than the original array', () => {
    const messages: MessageLog = [message('a')]

    expect(applyTranscriptLimit(messages, 5).messageLog).not.toBe(messages)
  })

  it('keeps the most recent entries and reports the rest as evicted', () => {
    const messages: MessageLog = [
      message('a'),
      message('b'),
      message('c'),
      message('d'),
    ]
    const { messageLog, evicted } = applyTranscriptLimit(messages, 2)

    expect(messageLog.map(({ id }) => id)).toEqual(['c', 'd'])
    expect(evicted.map(({ id }) => id)).toEqual(['a', 'b'])
  })

  it('evicts everything at a limit of zero', () => {
    const messages: MessageLog = [message('a'), message('b')]
    const { messageLog, evicted } = applyTranscriptLimit(messages, 0)

    expect(messageLog).toEqual([])
    expect(evicted).toHaveLength(2)
  })

  it('handles an empty log', () => {
    expect(applyTranscriptLimit([], 10)).toEqual({
      messageLog: [],
      evicted: [],
    })
  })
})

describe('getInlineMediaUris', () => {
  it('picks out only the inline media', () => {
    expect(
      getInlineMediaUris([
        message('a'),
        media('b', 'magnet:b'),
        message('c'),
        media('d', 'magnet:d'),
      ])
    ).toEqual(['magnet:b', 'magnet:d'])
  })

  it('returns nothing for a log of plain messages', () => {
    expect(getInlineMediaUris([message('a')])).toEqual([])
  })
})
