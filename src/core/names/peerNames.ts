import { funAnimalName } from 'fun-animal-names'

import { Peer } from 'core/models/chat'

/**
 * The stable, generated nickname for a user id. Every user has one, whether or
 * not they have also chosen a custom username.
 */
export const getPeerName = (userId: string) => funAnimalName(userId)

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
 * The name to show in prose (alerts, notifications). A user with a custom
 * username is shown as `Custom (Generated Name)` so that the generated name —
 * which is the only identifier other peers can independently verify — stays
 * visible. A user without one is shown as just their generated name.
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
