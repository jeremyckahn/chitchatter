/**
 * Creates the element a peer's incoming audio plays through.
 *
 * It starts muted. `useUnlistedPeerAudioMute` unmutes it once its peer is in
 * the peer list, so audio from a peer the UI does not show is never heard,
 * even in the moment between this element starting to play and that hook's
 * effect running.
 */
export const createPeerAudio = (stream: MediaStream): HTMLAudioElement => {
  const audio = new Audio()

  audio.muted = true
  audio.srcObject = stream
  audio.autoplay = true

  return audio
}

/**
 * Silences an element that is being replaced or dropped. Once an element is no
 * longer in `peerAudioChannels`, nothing else can reach it: not the volume
 * control, not `deletePeerAudio` and not the mute hook. It has to be stopped
 * here or it plays on with no control until its track ends.
 *
 * Safe to call more than once on the same element.
 */
export const releasePeerAudio = (audio: HTMLAudioElement | undefined): void => {
  if (!audio) return

  audio.muted = true
  audio.pause()
  audio.srcObject = null
}
