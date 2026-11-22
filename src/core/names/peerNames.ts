import { funAnimalName } from 'fun-animal-names'

import { Peer } from 'core/models/chat'

/**
 * The stable, generated nickname for a user id. Every user has one, whether or
 * not they have also chosen a custom username.
 *
 * It is a friendly label, **not** an identifier. It is drawn from only about
 * 24,000 names by a public function, so anyone can make a key whose name
 * matches another user's, and busy rooms will see accidental matches. Use
 * {@link getPeerFingerprint} to tell users apart.
 */
export const getPeerName = (userId: string) => funAnimalName(userId)

/**
 * How many hex digits of a user id a fingerprint shows: 64 bits. Producing a
 * key whose fingerprint matches a given user's takes on the order of 2^64 key
 * generations, which is out of reach, unlike matching a generated name.
 */
export const PEER_FINGERPRINT_HEX_LENGTH = 16

/** How many hex digits a fingerprint shows between spaces, for readability. */
const peerFingerprintGroupLength = 4

/** The shape of a user id derived from a public key by `deriveUserId`. */
const keyDerivedUserIdPattern = /^[0-9a-f]{64}$/

/**
 * A short, human-comparable fingerprint of a user's public key, such as
 * `c62a 8abe 32b4 43bb`: the start of their user id, which is the SHA-256 of
 * that key (see `deriveUserId`).
 *
 * Unlike {@link getPeerName}, this is long enough that nobody can make a key
 * that matches someone else's, so it is what people compare to be sure who
 * they are talking to. A VERIFIED peer has proven it holds the key behind its
 * fingerprint.
 *
 * `null` for an id that does not have the shape of a key-derived id, because
 * there is no key for it to stand for. A non-null result says nothing about
 * whoever presents the id: anyone can claim a user id (an unverified peer, or
 * the author a relayed message names), so only show a fingerprint for a sender
 * that has proven it holds the key.
 */
export const getPeerFingerprint = (userId: string): string | null => {
  if (!keyDerivedUserIdPattern.test(userId)) return null

  const fingerprintHex = userId.slice(0, PEER_FINGERPRINT_HEX_LENGTH)
  const groups: string[] = []

  for (
    let start = 0;
    start < fingerprintHex.length;
    start += peerFingerprintGroupLength
  ) {
    groups.push(fingerprintHex.slice(start, start + peerFingerprintGroupLength))
  }

  return groups.join(' ')
}

export interface NameResolutionContext {
  selfUserId: string
  selfCustomUsername: string
  peers: readonly Peer[]
}

export const isPeerSelf = (
  userId: string,
  { selfUserId }: NameResolutionContext
) => selfUserId === userId

/** The custom username a user has chosen, or `''` if they have not chosen one. */
export const getCustomUsername = (
  userId: string,
  context: NameResolutionContext
): string =>
  isPeerSelf(userId, context)
    ? context.selfCustomUsername
    : (context.peers.find(peer => peer.userId === userId)?.customUsername ?? '')

/** The single best name for a user: their custom username if set, else the generated one. */
export const getFriendlyName = (
  userId: string,
  context: NameResolutionContext
) => getCustomUsername(userId, context) || getPeerName(userId)

/**
 * Characters that render as nothing: zero-width spaces and joiners, bidi
 * controls, soft hyphens and the like. Inserted into a name, they make it
 * differ from the original without looking any different.
 */
const invisibleCharacterPattern = /\p{Default_Ignorable_Code_Point}/gu

/**
 * The form two names are compared in, so that names a reader would take to be
 * the same compare equal: invisible characters removed, Unicode compatibility
 * forms folded (fullwidth letters and the like), case ignored, and runs of
 * whitespace collapsed.
 *
 * Case is folded with `toLowerCase` rather than `toLocaleLowerCase`, so the
 * result does not depend on the viewer's locale.
 */
const normalizeNameForComparison = (name: string): string =>
  name
    .normalize('NFKC')
    .replace(invisibleCharacterPattern, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The user ids, among this user and the peers in `context`, whose name is
 * shared with at least one *other* user id.
 *
 * A shared name means the name alone cannot say who is who: either an
 * accidental collision or someone deliberately posing as another user. Each
 * user is known by their generated name and, if they chose one, their custom
 * username, and a match between any two of those counts. That catches a peer
 * that brute-forced a key to get someone's generated name, one that simply
 * typed in someone's custom username, and one that took someone's generated
 * name as its custom username. Names are compared loosely (see
 * {@link normalizeNameForComparison}), so `Alice`, ` alice ` and `Alice` with
 * a zero-width space inside it all match.
 *
 * The same user id appearing twice (one account in two tabs) is the same user,
 * and is not a collision, even if each copy reports a different custom
 * username.
 */
export const findUserIdsSharingPeerName = ({
  selfUserId,
  selfCustomUsername,
  peers,
}: NameResolutionContext): ReadonlySet<string> => {
  const userIdsByName = new Map<string, Set<string>>()

  const addName = (name: string, userId: string) => {
    const comparableName = normalizeNameForComparison(name)

    if (comparableName === '') return

    const userIds = userIdsByName.get(comparableName) ?? new Set<string>()

    userIds.add(userId)
    userIdsByName.set(comparableName, userIds)
  }

  const users = [
    { userId: selfUserId, customUsername: selfCustomUsername },
    ...peers,
  ]

  for (const { userId, customUsername } of users) {
    addName(getPeerName(userId), userId)
    addName(customUsername, userId)
  }

  const userIdsSharingName = new Set<string>()

  for (const userIds of userIdsByName.values()) {
    if (userIds.size < 2) continue

    for (const userId of userIds) userIdsSharingName.add(userId)
  }

  return userIdsSharingName
}

/**
 * The name to show in prose (alerts, notifications). A user with a custom
 * username is shown as `Custom (Generated Name)`, so that a custom username,
 * which anyone can set to anything, never hides the generated name.
 *
 * The generated name is still only a label: it narrows down who someone is,
 * but it does not prove it. See {@link getPeerFingerprint}.
 */
const formatDisplayName = (customUsername: string, userId: string) =>
  customUsername
    ? `${customUsername} (${getPeerName(userId)})`
    : getPeerName(userId)

export const getDisplayUsername = (
  userId: string,
  context: NameResolutionContext
) => formatDisplayName(getCustomUsername(userId, context), userId)

/**
 * The display name of a peer already in hand, resolved from the peer itself
 * rather than by searching the list for its user id.
 *
 * {@link getDisplayUsername} is the wrong tool once the peer is known. It finds
 * the peer by user id, which fails in exactly the case the name is most needed:
 * a rename can change the user id, so the incoming one matches nobody and the
 * custom username is lost. Two peers can also share a user id — the same
 * account in two tabs — and then the search picks whichever comes first.
 */
export const getPeerDisplayName = (peer: Peer) =>
  formatDisplayName(peer.customUsername, peer.userId)
