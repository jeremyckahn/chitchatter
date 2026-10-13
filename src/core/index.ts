/**
 * Chitchatter's application core.
 *
 * Framework- and DOM-agnostic: everything here runs in a browser, in Node and
 * in a terminal. See ./README.md for the boundary rule.
 *
 * Transports are deliberately NOT re-exported. `TrysteroTransport` owns the
 * WebRTC/Trystero stack, so importing this barrel should not drag that in, and
 * `InMemoryTransport` is an in-process test double that has no business in a
 * host-facing surface. Import either explicitly from
 * 'core/transport/TrysteroTransport' or 'core/transport/InMemoryTransport'.
 */

export * from 'core/adapters/noop'
export * from 'core/adapters/types'
export * from 'core/chat/ChatRoom'
export * from 'core/chat/ChatRoomRegistry'
export * from 'core/chat/events'
export * from 'core/chat/fileOffers'
export * from 'core/chat/identity'
export * from 'core/chat/peers'
export * from 'core/chat/protocol'
export * from 'core/chat/transcript'
export * from 'core/config/messaging'
export * from 'core/config/roomNames'
export * from 'core/config/turnConfig'
export * from 'core/crypto/Encryption'
export * from 'core/lib/Time'
export * from 'core/lib/sleep'
export * from 'core/lib/type-guards'
export * from 'core/models/chat'
export * from 'core/models/network'
export * from 'core/models/settings'
export * from 'core/names/peerNames'
export * from 'core/settings/serialization'
export * from 'core/settings/SettingsManager'
export * from 'core/transport/types'
