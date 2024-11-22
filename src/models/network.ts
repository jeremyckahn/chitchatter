// FIXME: Change these to be an enum
export const groupActionNamespace = 'g'
// FIXME: Multiple peer actions are probably overwriting each other
export const directMessageActionNamespace = 'dm'

// NOTE: Action names are limited to 12 characters, otherwise Trystero breaks.
export enum PeerAction {
  MESSAGE = 0,
  MEDIA_MESSAGE,
  MESSAGE_TRANSCRIPT,
  PEER_METADATA,
  AUDIO_CHANGE,
  VIDEO_CHANGE,
  SCREEN_SHARE,
  FILE_OFFER,
  TYPING_STATUS_CHANGE,
  VERIFICATION_TOKEN_ENCRYPTED,
  VERIFICATION_TOKEN_RAW,
}
