import { describe, expect, it } from 'vitest'

import {
  FileOfferMetadata,
  isFileKey,
  isFileOfferMetadata,
  isFileReference,
  isReceivedInlineMedia,
  isReceivedMessage,
  isInlineMedia,
  isUnsentInlineMedia,
  isUnsentMessage,
  TypingStatus,
  UnsentInlineMedia,
  UnsentMessage,
} from 'core/models/chat'

/**
 * Compile-time guards on the wire models.
 *
 * These shapes used to be declared `extends Record<string, any>`, which gives
 * them an index signature. That is not merely loose: an index signature makes
 * `keyof T` equal `string | number`, so `Omit<UnsentMessage, 'text'>` erased
 * every named field and `UnsentInlineMedia` accepted an object with none of
 * them, with any types, plus a typo'd read returning `any`.
 *
 * Each `@ts-expect-error` below is the real assertion: `tsc` fails on an
 * *unused* directive, so if the index signature ever comes back these stop
 * erroring and `npm run check:types` goes red. The runtime test exists so the
 * file is a test rather than a type-only island.
 */
describe('wire models', () => {
  it('rejects shapes that an index signature would have allowed', () => {
    // @ts-expect-error — missing every required field
    const missingFields: UnsentInlineMedia = { magnetURI: 'magnet:a' }

    const wrongFieldType: UnsentInlineMedia = {
      magnetURI: 'magnet:a',
      fileKey: 'key',
      id: 'id',
      // @ts-expect-error — `timeSent` is a number
      timeSent: 'not-a-number',
      authorId: 'author',
    }

    const message: UnsentMessage = {
      id: 'id',
      text: 'hello',
      timeSent: 0,
      authorId: 'author',
    }

    // @ts-expect-error — a misspelled read used to be `any`
    const typo = message.txt

    // @ts-expect-error — unknown fields are not silently accepted
    const extraField: TypingStatus = { isTyping: true, nope: 1 }

    const extraOnOffer: FileOfferMetadata = {
      magnetURI: 'magnet:a',
      fileKey: 'key',
      isAllInlineMedia: false,
      // @ts-expect-error — nor on the file-offer payload
      nope: 1,
    }

    expect([
      missingFields,
      wrongFieldType,
      typo,
      extraField,
      extraOnOffer,
    ]).toHaveLength(5)
  })
})

const fileKey = 'Ab-_'.repeat(10) + 'xyz'

const envelope = { id: 'id', authorId: 'author', timeSent: 1 }

describe('isFileKey', () => {
  it('accepts 43 base64url characters', () => {
    expect(isFileKey(fileKey)).toBe(true)
  })

  it.each([
    ['a shorter key', fileKey.slice(1)],
    ['a longer key', fileKey + 'A'],
    ['padding', fileKey.slice(1) + '='],
    ['standard base64 characters', fileKey.slice(2) + '+/'],
    ['an empty string', ''],
    ['a room name', 'my-secret-room'],
    ['a non-string', 42],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(isFileKey(value)).toBe(false)
  })
})

describe('isFileReference', () => {
  it('accepts a magnet URI with a valid key', () => {
    expect(isFileReference({ magnetURI: 'magnet:a', fileKey })).toBe(true)
  })

  it.each([
    ['no key', { magnetURI: 'magnet:a' }],
    ['a malformed key', { magnetURI: 'magnet:a', fileKey: 'short' }],
    ['no magnet URI', { fileKey }],
    ['a non-string magnet URI', { magnetURI: 1, fileKey }],
    ['null', null],
    ['an array', [fileKey]],
  ])('rejects %s', (_label, value) => {
    expect(isFileReference(value)).toBe(false)
  })
})

describe('isFileOfferMetadata', () => {
  it('accepts a complete offer', () => {
    expect(
      isFileOfferMetadata({
        magnetURI: 'magnet:a',
        fileKey,
        isAllInlineMedia: true,
      })
    ).toBe(true)
  })

  it('rejects an offer without a boolean isAllInlineMedia', () => {
    expect(isFileOfferMetadata({ magnetURI: 'magnet:a', fileKey })).toBe(false)
    expect(
      isFileOfferMetadata({
        magnetURI: 'magnet:a',
        fileKey,
        isAllInlineMedia: 'yes',
      })
    ).toBe(false)
  })

  it('rejects an offer without a key, as an older peer sends', () => {
    expect(
      isFileOfferMetadata({ magnetURI: 'magnet:a', isAllInlineMedia: false })
    ).toBe(false)
  })
})

describe('inline media and message validators', () => {
  const media = { ...envelope, magnetURI: 'magnet:a', fileKey }

  it('accepts unsent and received inline media', () => {
    expect(isUnsentInlineMedia(media)).toBe(true)
    expect(isReceivedInlineMedia({ ...media, timeReceived: 2 })).toBe(true)
  })

  it('requires a receipt time on received inline media', () => {
    expect(isReceivedInlineMedia(media)).toBe(false)
    expect(isReceivedInlineMedia({ ...media, timeReceived: 'now' })).toBe(false)
  })

  it.each([
    ['no key', { ...envelope, magnetURI: 'magnet:a' }],
    ['no id', { ...media, id: undefined }],
    ['a non-string author', { ...media, authorId: 7 }],
    ['a non-finite send time', { ...media, timeSent: Infinity }],
  ])('rejects inline media with %s', (_label, value) => {
    expect(isUnsentInlineMedia(value)).toBe(false)
  })

  it('accepts a received message and rejects one missing its text', () => {
    const message = { ...envelope, text: 'hi', timeReceived: 2 }

    expect(isReceivedMessage(message)).toBe(true)
    expect(isReceivedMessage({ ...message, text: undefined })).toBe(false)
    expect(isReceivedMessage({ ...envelope, text: 'hi' })).toBe(false)
  })

  // Regression: such a payload passed as a text message, but hosts render
  // anything with a `magnetURI` as inline media, so it was downloaded with an
  // undefined key.
  it('rejects a text message carrying a magnet URI', () => {
    const smuggled = { ...envelope, text: 'hi', magnetURI: 'magnet:a' }

    expect(isInlineMedia(smuggled)).toBe(true)
    expect(isUnsentMessage(smuggled)).toBe(false)
    expect(isReceivedMessage({ ...smuggled, timeReceived: 2 })).toBe(false)
  })
})
