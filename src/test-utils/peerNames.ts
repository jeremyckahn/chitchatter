import { getPeerName } from 'core/names/peerNames'

/**
 * The `index`th key-derived-looking user id: 64 lowercase hex digits, which
 * differ within the fingerprint's leading digits as real derived ids do.
 */
const syntheticUserId = (index: number) =>
  index.toString(16).padStart(16, '0').padEnd(64, '0')

/**
 * Two different key-derived-looking user ids that share a generated name.
 *
 * Found the same way an attacker would — by trying ids until two names match —
 * which takes a few hundred tries, since there are only about 24,000 names. It
 * is deterministic, so every test run gets the same pair.
 */
export const findCollidingUserIds = (): readonly [string, string] => {
  const userIdsByName = new Map<string, string>()

  for (let index = 0; ; index++) {
    const userId = syntheticUserId(index)
    const name = getPeerName(userId)
    const earlierUserId = userIdsByName.get(name)

    if (earlierUserId !== undefined) return [earlierUserId, userId]

    userIdsByName.set(name, userId)
  }
}
