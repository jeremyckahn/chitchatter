import { describe, expect, it } from 'vitest'

import {
  identifierMaxLength,
  parseTranscript,
  parseUnsentInlineMedia,
  parseUnsentMessage,
} from 'core/chat/messageValidation'
import { messageCharacterSizeLimit } from 'core/config/messaging'

const magnetURI = `magnet:?xt=urn:btih:${'e'.repeat(40)}`

const message = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  text: 'hello',
  timeSent: 1_000,
  authorId: 'user-1',
  ...overrides,
})

const media = (overrides: Record<string, unknown> = {}) => ({
  id: 'i1',
  magnetURI,
  timeSent: 1_000,
  authorId: 'user-1',
  ...overrides,
})

const receivedAt = 5_000

describe('parseUnsentMessage', () => {
  it('returns the four fields of a valid message', () => {
    expect(parseUnsentMessage(message())).toEqual(message())
  })

  it('returns a copy that carries nothing the protocol does not define', () => {
    const input = message({ extra: 1, magnetURI })
    const parsed = parseUnsentMessage(input)

    expect(parsed).toEqual(message())
    expect(parsed).not.toBe(input)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'hello'],
    ['an array', [message()]],
    ['a missing id', message({ id: undefined })],
    ['an empty id', message({ id: '' })],
    ['a numeric id', message({ id: 1 })],
    ['an over-long id', message({ id: 'x'.repeat(identifierMaxLength + 1) })],
    ['a missing author', message({ authorId: undefined })],
    ['an empty author', message({ authorId: '' })],
    [
      'an over-long author',
      message({ authorId: 'x'.repeat(identifierMaxLength + 1) }),
    ],
    ['missing text', message({ text: undefined })],
    ['numeric text', message({ text: 1 })],
    [
      'over-long text',
      message({ text: 'x'.repeat(messageCharacterSizeLimit + 1) }),
    ],
    ['a string timestamp', message({ timeSent: '1' })],
    ['a NaN timestamp', message({ timeSent: NaN })],
    ['an infinite timestamp', message({ timeSent: Infinity })],
    ['a timestamp beyond the Date range', message({ timeSent: 8.64e15 + 1 })],
  ])('rejects %s', (_label, input) => {
    expect(parseUnsentMessage(input)).toBeNull()
  })

  it('accepts the edges of what is allowed', () => {
    expect(
      parseUnsentMessage(
        message({
          id: 'x'.repeat(identifierMaxLength),
          text: 'x'.repeat(messageCharacterSizeLimit),
          timeSent: -8.64e15,
        })
      )
    ).not.toBeNull()
    expect(
      parseUnsentMessage(message({ text: '', timeSent: 8.64e15 }))
    ).not.toBeNull()
  })

  it('formats every timestamp it accepts without throwing', () => {
    // The reason the range is what it is: the renderer calls this.
    const format = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' })

    for (const timeSent of [-8.64e15, 0, 8.64e15]) {
      const parsed = parseUnsentMessage(message({ timeSent }))

      expect(parsed).not.toBeNull()
      expect(() => format.format(parsed?.timeSent)).not.toThrow()
    }
  })
})

describe('parseUnsentInlineMedia', () => {
  it('returns the fields of a valid inline media message', () => {
    expect(parseUnsentInlineMedia(media())).toEqual(media())
  })

  it.each([
    ['null', null],
    ['an unsafe magnet', media({ magnetURI: 'https://a.example/a.torrent' })],
    ['a missing magnet', media({ magnetURI: undefined })],
    ['a bad envelope', media({ authorId: 5 })],
  ])('rejects %s', (_label, input) => {
    expect(parseUnsentInlineMedia(input)).toBeNull()
  })
})

describe('parseTranscript', () => {
  const parse = (value: unknown, limit = 10) =>
    parseTranscript(value, { limit, receivedAt })

  it.each([
    ['null', null],
    ['a string', 'abc'],
    ['an object', { length: 1, 0: message() }],
    ['a number', 3],
  ])('is null for %s', (_label, value) => {
    expect(parse(value)).toBeNull()
  })

  it('is empty for an empty list', () => {
    expect(parse([])).toEqual({ messageLog: [], discardedCount: 0 })
  })

  it('stamps every entry with the receipt time, replacing the sender’s', () => {
    const parsed = parse([
      { ...message(), timeReceived: 1 },
      { ...media(), timeReceived: 2 },
    ])

    expect(parsed?.messageLog).toEqual([
      { ...message(), timeReceived: receivedAt },
      { ...media(), timeReceived: receivedAt },
    ])
  })

  it('tells a text entry from a media entry by its fields', () => {
    const parsed = parse([message({ id: 'a' }), media({ id: 'b' })])

    expect(parsed?.messageLog.map(entry => 'magnetURI' in entry)).toEqual([
      false,
      true,
    ])
  })

  it('discards an entry that has both text and a magnet, or neither', () => {
    const parsed = parse([
      message({ id: 'both', magnetURI }),
      message({ id: 'neither', text: undefined }),
      message({ id: 'ok' }),
    ])

    expect(parsed?.messageLog.map(({ id }) => id)).toEqual(['ok'])
    expect(parsed?.discardedCount).toBe(2)
  })

  it('keeps the most recent entries when the list is over the limit', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      message({ id: `m${i}` })
    )
    const parsed = parse(entries, 4)

    expect(parsed?.messageLog.map(({ id }) => id)).toEqual([
      'm2',
      'm3',
      'm4',
      'm5',
    ])
    expect(parsed?.discardedCount).toBe(2)
  })

  it('keeps nothing at a limit of zero, rather than everything', () => {
    // `slice(-0)` is `slice(0)`.
    const parsed = parse([message()], 0)

    expect(parsed).toEqual({ messageLog: [], discardedCount: 1 })
  })

  it('does work bounded by the limit, however long the list claims to be', () => {
    // A naive loop over a list this long would not finish.
    const parsed = parse(new Array(2 ** 31), 3)

    expect(parsed?.messageLog).toEqual([])
    expect(parsed?.discardedCount).toBe(2 ** 31)
  })

  it('keeps the first entry for an id', () => {
    const parsed = parse([
      message({ id: 'x', text: 'first' }),
      media({ id: 'x' }),
      message({ id: 'x', text: 'third' }),
    ])

    expect(parsed?.messageLog).toEqual([
      { ...message({ id: 'x', text: 'first' }), timeReceived: receivedAt },
    ])
    expect(parsed?.discardedCount).toBe(2)
  })

  it('counts discards from the whole list, including what the limit cut', () => {
    const parsed = parse(
      [null, null, message({ id: 'a' }), null, message({ id: 'b' })],
      3
    )

    expect(parsed?.messageLog.map(({ id }) => id)).toEqual(['a', 'b'])
    expect(parsed?.discardedCount).toBe(3)
  })
})
