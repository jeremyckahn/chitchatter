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

export type UserMetadata = {
  userId: string
  customUsername: string
  publicKeyString: string
  identitySignatureBase64: string
}
