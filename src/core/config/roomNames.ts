import { v4 as uuid } from 'uuid'
// `random-word-slugs` only exposes its word lists through this deep import.
// It is used instead of `generateSlug` because that draws from `Math.random()`;
// the words are picked here with a CSPRNG instead.
import { wordList } from 'random-word-slugs/dist/words'

export enum RoomNameType {
  UUID = 'uuid',
  PASSPHRASE = 'passphrase',
}

/**
 * A public room has no password: its name is the only thing keeping outsiders
 * out, and the swarm identifier it announces under is derived from the name
 * alone. A passphrase therefore has to be too large to search offline. Four
 * words from the full lists are only ~33 bits, so a random suffix tops the
 * name up to ~68 bits.
 */
const PASSPHRASE_WORD_PATTERN = [
  wordList.adjective,
  wordList.noun,
  wordList.adjective,
  wordList.noun,
] as const

export const PASSPHRASE_SUFFIX_LENGTH = 7

/**
 * Exactly 32 characters (5 bits each). A random byte has 256 possible values,
 * which divides evenly by 32, so taking its low 5 bits picks every character
 * with equal probability (no modulo bias). If the alphabet length changes,
 * `PASSPHRASE_SUFFIX_INDEX_MASK` has to change with it, and the length must
 * stay a power of two.
 */
const PASSPHRASE_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'

/**
 * Keeps only the low 5 bits of a random byte (`0b11111` is 31), turning it
 * into an index from 0 to 31 into `PASSPHRASE_SUFFIX_ALPHABET`.
 */
const PASSPHRASE_SUFFIX_INDEX_MASK = 0b11111

const PASSPHRASE_SUFFIX_BITS_PER_CHARACTER = Math.log2(
  PASSPHRASE_SUFFIX_ALPHABET.length
)

const UINT32_RANGE = 2 ** 32

/**
 * Returns a uniformly distributed integer in `[0, exclusiveMax)`, using
 * rejection sampling so that no value is more likely than another.
 */
const getSecureRandomIndex = (exclusiveMax: number): number => {
  const unbiasedLimit = UINT32_RANGE - (UINT32_RANGE % exclusiveMax)
  const buffer = new Uint32Array(1)

  let value: number

  // Values at or above the limit would make the lowest indices more likely
  // than the rest, so they are discarded and a fresh value is drawn.
  do {
    globalThis.crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= unbiasedLimit)

  return value % exclusiveMax
}

const getSecureRandomSuffix = (): string => {
  const bytes = globalThis.crypto.getRandomValues(
    new Uint8Array(PASSPHRASE_SUFFIX_LENGTH)
  )

  return Array.from(bytes, byte =>
    PASSPHRASE_SUFFIX_ALPHABET.charAt(byte & PASSPHRASE_SUFFIX_INDEX_MASK)
  ).join('')
}

/**
 * The number of bits of entropy in a generated passphrase room name. Exposed
 * so that the guarantee the generator makes can be asserted in tests.
 */
export const getPassphraseEntropyBits = (): number => {
  const wordBits = PASSPHRASE_WORD_PATTERN.reduce(
    (bits, words) => bits + Math.log2(words.length),
    0
  )

  return (
    wordBits + PASSPHRASE_SUFFIX_LENGTH * PASSPHRASE_SUFFIX_BITS_PER_CHARACTER
  )
}

const generatePassphrase = (): string => {
  const words = PASSPHRASE_WORD_PATTERN.map(
    candidates => candidates[getSecureRandomIndex(candidates.length)].word
  )

  return [...words, getSecureRandomSuffix()].join('-')
}

export class RoomNameGenerator {
  static generate(type: RoomNameType = RoomNameType.UUID): string {
    switch (type) {
      case RoomNameType.PASSPHRASE:
        return generatePassphrase()
      case RoomNameType.UUID:
      default:
        return uuid()
    }
  }
}
