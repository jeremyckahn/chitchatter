import { describe, expect, it } from 'vitest'

import {
  customUsernameMaxLength,
  identifierMaxLength,
  parseFileOfferMetadata,
  parseIdentityChallenge,
  parseIdentityProof,
  parseTranscript,
  parseUnsentInlineMedia,
  parseUnsentMessage,
  parseUserMetadata,
} from 'core/chat/messageValidation'
import { messageCharacterSizeLimit } from 'core/config/messaging'

const magnetURI = `magnet:?xt=urn:btih:${'e'.repeat(40)}`

const fileKey = 'k'.repeat(43)

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
  fileKey,
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
    // What a peer on an older version sends: files were keyed by the room id
    ['a missing key', media({ fileKey: undefined })],
    ['a malformed key', media({ fileKey: 'guessable' })],
  ])('rejects %s', (_label, input) => {
    expect(parseUnsentInlineMedia(input)).toBeNull()
  })

  it('drops a transcript entry whose media has no key', () => {
    const parsed = parseTranscript(
      [media({ id: 'keyless', fileKey: undefined }), media({ id: 'ok' })],
      { limit: 10, receivedAt }
    )

    expect(parsed?.messageLog.map(({ id }) => id)).toEqual(['ok'])
    expect(parsed?.discardedCount).toBe(1)
  })
})

describe('parseFileOfferMetadata', () => {
  const offer = (overrides: Record<string, unknown> = {}) => ({
    magnetURI,
    fileKey,
    isAllInlineMedia: false,
    ...overrides,
  })

  it('returns the fields of a valid offer', () => {
    expect(parseFileOfferMetadata(offer())).toEqual(offer())
    expect(parseFileOfferMetadata(offer({ isAllInlineMedia: true }))).toEqual(
      offer({ isAllInlineMedia: true })
    )
  })

  it('returns a copy that carries nothing the protocol does not define', () => {
    const parsed = parseFileOfferMetadata(offer({ extra: 'smuggled' }))

    expect(parsed).toEqual(offer())
    expect(parsed).not.toHaveProperty('extra')
  })

  it.each([
    ['null', null],
    ['a string', 'magnet:?xt=urn:btih:abc'],
    ['an array', [offer()]],
    ['a missing key', offer({ fileKey: undefined })],
    ['a malformed key', offer({ fileKey: 'guessable' })],
    ['an unsafe magnet', offer({ magnetURI: 'https://a.example/a.torrent' })],
    ['a missing magnet', offer({ magnetURI: undefined })],
    ['a non-boolean inline flag', offer({ isAllInlineMedia: 'yes' })],
    ['a missing inline flag', offer({ isAllInlineMedia: undefined })],
  ])('rejects %s', (_label, input) => {
    expect(parseFileOfferMetadata(input)).toBeNull()
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
      { ...message(), timeReceived: receivedAt, isRelayed: true },
      { ...media(), timeReceived: receivedAt, isRelayed: true },
    ])
  })

  it('marks every entry as relayed, whatever the sender says', () => {
    const parsed = parse([
      message({ id: 'a', isRelayed: false }),
      media({ id: 'b', authorVerificationState: 2 }),
    ])

    expect(parsed?.messageLog).toEqual([
      { ...message({ id: 'a' }), timeReceived: receivedAt, isRelayed: true },
      { ...media({ id: 'b' }), timeReceived: receivedAt, isRelayed: true },
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
      {
        ...message({ id: 'x', text: 'first' }),
        timeReceived: receivedAt,
        isRelayed: true,
      },
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

describe('parseUserMetadata', () => {
  const metadata = (overrides: Record<string, unknown> = {}) => ({
    userId: 'user-1',
    customUsername: 'Ada',
    publicKeyString: 'AAAA+/8=',
    ...overrides,
  })

  it('accepts a well-formed announcement', () => {
    expect(parseUserMetadata(metadata())).toEqual(metadata())
  })

  it('cuts an oversized username rather than hiding the peer', () => {
    expect(
      parseUserMetadata(
        metadata({ customUsername: 'a'.repeat(customUsernameMaxLength + 1) })
      )
    ).toEqual(metadata({ customUsername: 'a'.repeat(customUsernameMaxLength) }))
  })

  it('drops fields it did not check, including a legacy signature', () => {
    expect(
      parseUserMetadata(metadata({ identitySignatureBase64: 'AAAA' }))
    ).toEqual(metadata())
  })

  it.each<[string, unknown]>([
    ['a non-object', 'Ada'],
    ['an empty user id', metadata({ userId: '' })],
    ['a non-string username', metadata({ customUsername: 7 })],
    ['a non-base64 key', metadata({ publicKeyString: 'not a key' })],
    ['an oversized key', metadata({ publicKeyString: 'A'.repeat(4_097) })],
  ])('rejects %s', (_, value) => {
    expect(parseUserMetadata(value)).toBeNull()
  })
})

describe('parseIdentityChallenge', () => {
  const challenge = 'c'.repeat(43)

  it('accepts a well-formed challenge and nothing else', () => {
    expect(parseIdentityChallenge({ challenge, extra: true })).toEqual({
      challenge,
    })
  })

  it.each<[string, unknown]>([
    ['a non-object', challenge],
    ['a short challenge', { challenge: 'c'.repeat(42) }],
    ['an arbitrary string to sign', { challenge: 'sign me, please' }],
  ])('rejects %s', (_, value) => {
    expect(parseIdentityChallenge(value)).toBeNull()
  })
})

describe('parseIdentityProof', () => {
  const proof = { challenge: 'c'.repeat(43), identitySignatureBase64: 'AAAA' }

  it('accepts a well-formed proof', () => {
    expect(parseIdentityProof(proof)).toEqual(proof)
  })

  it.each<[string, unknown]>([
    ['a missing signature', { challenge: proof.challenge }],
    ['a malformed challenge', { ...proof, challenge: 'x' }],
    ['a non-base64 signature', { ...proof, identitySignatureBase64: '!!' }],
    [
      'an oversized signature',
      { ...proof, identitySignatureBase64: 'A'.repeat(2_049) },
    ],
  ])('rejects %s', (_, value) => {
    expect(parseIdentityProof(value)).toBeNull()
  })
})
