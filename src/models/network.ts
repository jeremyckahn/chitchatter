// NOTE: Action names are limited to 12 characters, otherwise Trystero breaks.
export enum PeerActions {
  MESSAGE = 'MESSAGE',
  MESSAGE_TRANSCRIPT = 'MSG_XSCRIPT',
  PEER_NAME = 'PEER_NAME',
  AUDIO_CHANGE = 'AUDIO_CHANGE',
  VIDEO_CHANGE = 'VIDEO_CHANGE',
  SCREEN_SHARE = 'SCREEN_SHARE',
  FILE_SHARE_STATE = 'FS_STATE',
  FILE_OFFER = 'FILE_OFFER',
}
