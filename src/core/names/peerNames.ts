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
export const getDisplayUsername = (
  userId: string,
  context: NameResolutionContext
) => {
  const customUsername = getCustomUsername(userId, context)

  return customUsername
    ? `${customUsername} (${getPeerName(userId)})`
    : getPeerName(userId)
}
