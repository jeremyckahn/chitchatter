import { describe, expect, it, vi } from 'vitest'
import { validate as isUuid, version as getUuidVersion } from 'uuid'
import { wordList } from 'random-word-slugs/dist/words'

import {
  getPassphraseEntropyBits,
  PASSPHRASE_SUFFIX_LENGTH,
  RoomNameGenerator,
  RoomNameType,
} from 'core/config/roomNames'

const adjectives: ReadonlySet<string> = new Set(
  wordList.adjective.map(({ word }) => word)
)
const nouns: ReadonlySet<string> = new Set(
  wordList.noun.map(({ word }) => word)
)

/**
 * An offline search of the whole name space costs two SHA-1 hashes per
 * candidate. At ~5e9 hashes per second (one fast GPU), 2^64 candidates take
 * centuries, so 64 bits is the floor a public-room name has to clear.
 */
const MIN_PASSPHRASE_ENTROPY_BITS = 64

describe('RoomNameGenerator', () => {
  describe('UUID', () => {
    it('is the default type', () => {
      const name = RoomNameGenerator.generate()

      expect(isUuid(name)).toBe(true)
      expect(getUuidVersion(name)).toBe(4)
    })
  })

  describe('passphrase', () => {
    it('is adjective-noun-adjective-noun followed by a random suffix', () => {
      const name = RoomNameGenerator.generate(RoomNameType.PASSPHRASE)
      const parts = name.split('-')

      expect(parts).toHaveLength(5)

      const [adjective1, noun1, adjective2, noun2, suffix] = parts

      expect(adjectives.has(adjective1)).toBe(true)
      expect(nouns.has(noun1)).toBe(true)
      expect(adjectives.has(adjective2)).toBe(true)
      expect(nouns.has(noun2)).toBe(true)
      expect(suffix).toMatch(
        new RegExp(`^[a-z2-7]{${PASSPHRASE_SUFFIX_LENGTH}}$`)
      )
    })

    it('has enough entropy to resist an offline search of the name space', () => {
      expect(getPassphraseEntropyBits()).toBeGreaterThanOrEqual(
        MIN_PASSPHRASE_ENTROPY_BITS
      )
    })

    it('uses the platform CSPRNG and never Math.random', () => {
      const mathRandom = vi.spyOn(Math, 'random')
      const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues')

      try {
        RoomNameGenerator.generate(RoomNameType.PASSPHRASE)

        expect(getRandomValues).toHaveBeenCalled()
        expect(mathRandom).not.toHaveBeenCalled()
      } finally {
        mathRandom.mockRestore()
        getRandomValues.mockRestore()
      }
    })

    it('rejects out-of-range random values instead of folding them in (no modulo bias)', () => {
      const wordCount = wordList.adjective.length
      const unbiasedLimit = 2 ** 32 - (2 ** 32 % wordCount)
      const real = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
      let rejectedValueServed = false

      const getRandomValues = vi
        .spyOn(globalThis.crypto, 'getRandomValues')
        .mockImplementation(array => {
          if (array instanceof Uint32Array && !rejectedValueServed) {
            rejectedValueServed = true
            array[0] = unbiasedLimit // First value outside the unbiased range
          } else if (array !== null) {
            real(array)
          }

          return array
        })

      try {
        const name = RoomNameGenerator.generate(RoomNameType.PASSPHRASE)

        expect(rejectedValueServed).toBe(true)
        expect(adjectives.has(name.split('-')[0])).toBe(true)
        // The rejected draw is retried (1 extra call), on top of one draw per word.
        const uint32Calls = getRandomValues.mock.calls.filter(
          ([array]) => array instanceof Uint32Array
        )

        expect(uint32Calls.length).toBeGreaterThanOrEqual(5)
      } finally {
        getRandomValues.mockRestore()
      }
    })
  })
})
