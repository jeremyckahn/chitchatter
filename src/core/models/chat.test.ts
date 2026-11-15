import { describe, expect, it } from 'vitest'

import {
  FileOfferMetadata,
  isFileKey,
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
