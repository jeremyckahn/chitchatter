import { AudioChannelName } from 'core/models/chat'

/**
 * Web-only media types. These hold live DOM objects, so they deliberately live
 * outside `src/core` — see src/core/README.md for the boundary rule.
 */
export type AudioChannel = Partial<Record<AudioChannelName, HTMLAudioElement>>
