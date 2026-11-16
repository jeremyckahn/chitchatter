export const messageCharacterSizeLimit = 10_000
export const messageTranscriptSizeLimit = 150

/**
 * How long after the last keystroke a peer is still considered to be typing.
 * Matches the debounce interval the React implementation used.
 */
export const typingStatusExpiry = 2_000

/**
 * How long a peer has to answer an identity challenge before it is shown as
 * unverified. A peer that never answers (one running a build that predates the
 * challenge) would otherwise stay "verifying" for as long as it is connected.
 */
export const identityVerificationTimeout = 15_000

/**
 * How many messages are held for a peer whose metadata has not arrived yet.
 * A message names no author the receiver can trust, so it waits for the
 * sender to be known; the bound keeps a peer that never announces itself
 * from growing the queue without limit.
 */
export const heldMessageLimit = 20
