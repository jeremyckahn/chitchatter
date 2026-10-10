import { describe, expect, it, vi } from 'vitest'

import {
  applyFileOffer,
  FileHandle,
  getInlineMediaFiles,
  isEveryFileInlineMedia,
  isInlineMediaFile,
  removeFileOffer,
  shouldRescindOffer,
} from 'core/chat/fileOffers'
import { FileOfferMetadata } from 'core/models/chat'

const file = (name: string, type: string): FileHandle => ({
  name,
  type,
  size: 1,
})

describe('isInlineMediaFile', () => {
  it.each([
    ['image/png', true],
    ['image/svg+xml', true],
    ['audio/mpeg', true],
    ['video/mp4', true],
    ['application/pdf', false],
    ['text/plain', false],
    ['', false],
  ])('treats %s as inline media: %s', (type, expected) => {
    expect(isInlineMediaFile(file('f', type))).toBe(expected)
  })
})

describe('isEveryFileInlineMedia', () => {
  it('is true when every file is inline media', () => {
    expect(
      isEveryFileInlineMedia([file('a', 'image/png'), file('b', 'video/mp4')])
    ).toBe(true)
  })

  it('is false when any file is not', () => {
    expect(
      isEveryFileInlineMedia([
        file('a', 'image/png'),
        file('b', 'application/zip'),
      ])
    ).toBe(false)
  })

  it('is false for an empty, null or undefined list', () => {
    expect(isEveryFileInlineMedia([])).toBe(false)
    expect(isEveryFileInlineMedia(null)).toBe(false)
    expect(isEveryFileInlineMedia(undefined)).toBe(false)
  })
})

describe('getInlineMediaFiles', () => {
  it('keeps only the inline media files', () => {
    expect(
      getInlineMediaFiles([
        file('a', 'image/png'),
        file('b', 'application/zip'),
        file('c', 'audio/ogg'),
      ]).map(({ name }) => name)
    ).toEqual(['a', 'c'])
  })
})

describe('applyFileOffer / removeFileOffer', () => {
  const metadata: FileOfferMetadata = {
    magnetURI: 'magnet:a',
    isAllInlineMedia: false,
  }

  it('records an offer against its peer', () => {
    expect(applyFileOffer({}, 'peer-1', metadata)).toEqual({
      'peer-1': metadata,
    })
  })

  it('replaces an existing offer from the same peer', () => {
    const replacement: FileOfferMetadata = {
      magnetURI: 'magnet:b',
      isAllInlineMedia: true,
    }

    expect(
      applyFileOffer({ 'peer-1': metadata }, 'peer-1', replacement)
    ).toEqual({ 'peer-1': replacement })
  })

  it('does not mutate the offers it is given', () => {
    const offers = { 'peer-1': metadata }

    applyFileOffer(offers, 'peer-2', metadata)
    removeFileOffer(offers, 'peer-1')

    expect(offers).toEqual({ 'peer-1': metadata })
  })

  it('removes an offer and ignores an unknown peer', () => {
    expect(removeFileOffer({ 'peer-1': metadata }, 'peer-1')).toEqual({})
    expect(removeFileOffer({ 'peer-1': metadata }, 'nobody')).toEqual({
      'peer-1': metadata,
    })
  })
})

describe('shouldRescindOffer', () => {
  const isOffering = vi.fn(() => true)

  it('rescinds a non-inline offer that is still being seeded', () => {
    expect(
      shouldRescindOffer(
        { magnetURI: 'magnet:a', isAllInlineMedia: false },
        isOffering
      )
    ).toBe(true)
  })

  it('spares an all-inline-media offer, which stays reachable in the transcript', () => {
    expect(
      shouldRescindOffer(
        { magnetURI: 'magnet:a', isAllInlineMedia: true },
        isOffering
      )
    ).toBe(false)
  })

  it('does nothing when the offer is not being seeded', () => {
    expect(
      shouldRescindOffer(
        { magnetURI: 'magnet:a', isAllInlineMedia: false },
        () => false
      )
    ).toBe(false)
  })

  it('tolerates a missing offer', () => {
    expect(shouldRescindOffer(null, isOffering)).toBe(false)
    expect(shouldRescindOffer(undefined, isOffering)).toBe(false)
  })
})
