import { describe, expect, it } from 'vitest'

import {
  applyTranscriptLimit,
  attributeOwnBackfill,
  getInlineMediaUris,
  settleAuthorVerification,
  withoutAuthorVerification,
} from 'core/chat/transcript'
import {
  InlineMedia,
  Message,
  MessageLog,
  PeerVerificationState,
  ReceivedMessage,
} from 'core/models/chat'

const message = (id: string): Message => ({
  id,
  text: id,
  timeSent: 0,
  authorId: 'author',
})

const media = (id: string, magnetURI: string): InlineMedia => ({
  id,
  magnetURI,
  fileKey: 'A'.repeat(43),
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

describe('settleAuthorVerification', () => {
  const received = (
    id: string,
    authorVerificationState: PeerVerificationState,
    authorId = 'author'
  ): ReceivedMessage => ({
    ...message(id),
    authorId,
    timeReceived: 1,
    authorVerificationState,
  })

  const settle = (messages: MessageLog, messageIds: string[]) =>
    settleAuthorVerification(messages, {
      messageIds: new Set(messageIds),
      authorId: 'author',
      verificationState: PeerVerificationState.VERIFIED,
    })

  it('gives the verdict to the named messages still awaiting one', () => {
    const settled = settle(
      [received('a', PeerVerificationState.VERIFYING)],
      ['a']
    )

    expect(settled).toEqual([received('a', PeerVerificationState.VERIFIED)])
  })

  it('leaves messages that already have a verdict alone', () => {
    const messages = [received('a', PeerVerificationState.UNVERIFIED)]

    expect(settle(messages, ['a'])).toEqual(messages)
  })

  it('leaves a message by another author alone, even when it shares an id', () => {
    const messages = [
      received('a', PeerVerificationState.VERIFYING, 'someone-else'),
    ]

    expect(settle(messages, ['a'])).toEqual(messages)
  })

  it('leaves messages it was not asked about alone', () => {
    const messages = [received('b', PeerVerificationState.VERIFYING)]

    expect(settle(messages, ['a'])).toEqual(messages)
  })

  it('leaves own and backfilled messages, which carry no verdict, alone', () => {
    const messages: MessageLog = [
      message('a'),
      { ...message('b'), timeReceived: 1 },
    ]

    expect(settle(messages, ['a', 'b'])).toEqual(messages)
  })
})

describe('withoutAuthorVerification', () => {
  it('strips the verdict and keeps everything else', () => {
    const entry: ReceivedMessage = {
      ...message('a'),
      timeReceived: 1,
      authorVerificationState: PeerVerificationState.VERIFIED,
    }

    expect(withoutAuthorVerification(entry)).toEqual({
      ...message('a'),
      timeReceived: 1,
    })
  })

  it('strips the relayed mark and keeps everything else', () => {
    const entry: ReceivedMessage = {
      ...message('a'),
      timeReceived: 1,
      isRelayed: true,
    }

    expect(withoutAuthorVerification(entry)).toEqual({
      ...message('a'),
      timeReceived: 1,
    })
  })
})

describe('attributeOwnBackfill', () => {
  const relayed = (id: string, authorId = 'sender'): ReceivedMessage => ({
    ...message(id),
    authorId,
    timeReceived: 1,
    isRelayed: true,
  })

  it('attributes the sender’s own relayed entries to it and leaves the rest alone', () => {
    const log: MessageLog = [
      relayed('own'),
      relayed('others', 'someone-else'),
      relayed('outside'),
    ]

    const { messageLog, attributed } = attributeOwnBackfill(log, {
      entryIds: new Set(['own', 'others']),
      authorId: 'sender',
      verificationState: PeerVerificationState.VERIFYING,
    })

    const own = {
      ...message('own'),
      authorId: 'sender',
      timeReceived: 1,
      authorVerificationState: PeerVerificationState.VERIFYING,
    }

    expect(messageLog).toEqual([own, log[1], log[2]])
    expect(attributed).toEqual([own])
  })

  it('does not touch an entry that is not relayed, even with a matching id', () => {
    const live: ReceivedMessage = {
      ...message('own'),
      authorId: 'sender',
      timeReceived: 1,
      authorVerificationState: PeerVerificationState.UNVERIFIED,
    }

    const { messageLog, attributed } = attributeOwnBackfill([live], {
      entryIds: new Set(['own']),
      authorId: 'sender',
      verificationState: PeerVerificationState.VERIFIED,
    })

    expect(messageLog).toEqual([live])
    expect(attributed).toEqual([])
  })
})
