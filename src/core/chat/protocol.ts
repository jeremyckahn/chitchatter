/**
 * The wire payloads exchanged between peers.
 *
 * These shapes are a compatibility contract: a change here is only safe if
 * every peer in a room is running it. They all extend `Record<string, any>`
 * because Trystero serializes action payloads as JSON.
 */

export interface UserMetadata extends Record<string, any> {
  userId: string
  customUsername: string
  publicKeyString: string
  identitySignatureBase64: string
}
