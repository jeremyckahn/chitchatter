import { Audio } from './Audio'

const audioBySoundUrl: Map<string, Audio> = new Map()

/**
 * The one {@link Audio} for a given sound, shared by everything that plays it.
 *
 * `new Audio` opens an `AudioContext` and never closes it, and browsers cap how
 * many a page may hold — Chrome allows six and throws `NotSupportedError` past
 * that. The app builds its room-level pieces per mount, and a direct-message
 * room is mounted for every peer in the list, so constructing one per consumer
 * runs the page out of contexts during normal use. Sounds are a handful of
 * fixed assets and playing one has no per-caller state, so there is nothing to
 * gain from a second instance.
 *
 * Deliberately eager about loading: the decode happens on construction, so the
 * first sound to play is audible rather than silently warming the cache.
 */
export const getSharedAudio = (audioDataUrl: string): Audio => {
  const existing = audioBySoundUrl.get(audioDataUrl)

  if (existing) return existing

  const audio = new Audio(audioDataUrl)

  audioBySoundUrl.set(audioDataUrl, audio)

  return audio
}
