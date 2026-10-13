import { afterEach, describe, expect, test, vi } from 'vitest'

import { getSharedAudio } from './sharedAudio'

const stubAudioContext = () => {
  const constructions = vi.fn()

  vi.stubGlobal(
    'AudioContext',
    class {
      destination = {}

      constructor() {
        constructions()
      }

      decodeAudioData = vi.fn(async () => ({}))

      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }))
    }
  )

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(new ArrayBuffer(8)))
  )

  return constructions
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getSharedAudio', () => {
  test('opens one AudioContext per sound however many callers ask for it', () => {
    const constructions = stubAudioContext()

    const first = getSharedAudio('data:audio/mp3;base64,AAA')
    const second = getSharedAudio('data:audio/mp3;base64,AAA')

    expect(second).toBe(first)

    // A browser caps how many `AudioContext`s a page may hold — Chrome allows
    // six and throws past that — and nothing ever closes one. The app builds
    // its room-level pieces per mount, with a direct-message room mounted for
    // every peer in the list, so one context per caller ran the page out of
    // them during ordinary use and crashed a render.
    expect(constructions).toHaveBeenCalledTimes(1)
  })

  test('keeps a separate instance per distinct sound', () => {
    const constructions = stubAudioContext()

    const chime = getSharedAudio('data:audio/mp3;base64,BBB')
    const beep = getSharedAudio('data:audio/mp3;base64,CCC')

    expect(beep).not.toBe(chime)
    expect(constructions).toHaveBeenCalledTimes(2)
  })
})
