/**
 * The wire payloads exchanged between peers.
 *
 * These shapes are a compatibility contract: a change here is only safe if
 * every peer in a room is running it.
 *
 * Declared as a `type` rather than an interface so that it satisfies
 * Trystero's `DataPayload` constraint through the implicit index signature a
 * `type` alias gets, without `extends Record<string, any>` defeating field
 * checking outright. See AGENTS.md.
 */

/**
 * A peer's self-description. It claims an identity but proves nothing: the
 * receiver answers it with an {@link IdentityChallenge}, and only a valid
 * {@link IdentityProof} in return marks the peer verified.
 */
export type UserMetadata = {
  userId: string
  customUsername: string
  publicKeyString: string
}

/** Sent by a verifier to the one peer whose metadata it is checking. */
export type IdentityChallenge = {
  challenge: string
}

/**
 * The answer to an {@link IdentityChallenge}: a signature over the statement
 * `getIdentityVerificationMessage` builds from the room id, the prover's user
 * id and peer id, and the challenge being answered.
 */
export type IdentityProof = {
  challenge: string
  identitySignatureBase64: string
}
