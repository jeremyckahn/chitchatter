import { ColorMode, isColorMode, UserSettings } from 'core/models/settings'
import { QueryParamKeys } from 'models/shell'

export enum PostMessageEventName {
  CONFIG = 'config',
  CONFIG_REQUESTED = 'configRequested',
}

export enum ChatEmbedAttributes {
  COLOR_MODE = 'color-mode',
  PLAY_MESSAGE_SOUND = 'play-message-sound',
  ROOM_NAME = 'room',
  ROOT_URL = 'root-url',
  USER_ID = 'user-id',
  USER_NAME = 'user-name',
}

/**
 * The settings an embedding page may configure through the SDK. This is
 * deliberately an allowlist: the host page is untrusted — anyone can embed
 * Chitchatter and name their own origin as the parent — so it must never be
 * able to set identity material such as the keypair.
 *
 * `userId` is allowed on purpose: it backs the documented `user-id` SDK
 * attribute, and it is a public, self-asserted label rather than a credential.
 * Every peer already sees it, and any peer can already claim any `userId`, so
 * letting the host choose one grants nothing new. Binding a `userId` to a key
 * is the job of peer key pinning (#634), not of this allowlist.
 */
const sdkConfigKeys = [
  'colorMode',
  'customUsername',
  'playSoundOnNewMessage',
  'userId',
] as const satisfies readonly (keyof UserSettings)[]

type SdkConfigKey = (typeof sdkConfigKeys)[number]

export type SdkConfig = Partial<Pick<UserSettings, SdkConfigKey>>

const isString = (value: unknown): value is string => typeof value === 'string'

// Keyed by every SdkConfigKey, so adding a key to sdkConfigKeys does not
// compile until it has a validator here.
const sdkConfigValidators: {
  [K in SdkConfigKey]: (value: unknown) => value is UserSettings[K]
} = {
  colorMode: (value): value is ColorMode =>
    isString(value) && isColorMode(value),
  customUsername: isString,
  playSoundOnNewMessage: (value): value is boolean =>
    typeof value === 'boolean',
  userId: isString,
}

export interface PostMessageEvent extends MessageEvent {
  data: {
    name: PostMessageEventName
    payload: unknown
  }
}

const postMessageEventNames: readonly string[] =
  Object.values(PostMessageEventName)

const isPostMessageEventName = (name: unknown): name is PostMessageEventName =>
  typeof name === 'string' && postMessageEventNames.includes(name)

export const isPostMessageEvent = (
  event: MessageEvent
): event is PostMessageEvent => {
  const data: unknown = event.data

  if (typeof data !== 'object' || data === null) return false
  if (!('name' in data && isPostMessageEventName(data.name))) return false
  if (!('payload' in data && typeof data.payload === 'object')) return false
  if (data.payload === null) return false

  return true
}

const copySdkConfigField = <K extends SdkConfigKey>(
  config: SdkConfig,
  payload: object,
  key: K
) => {
  // getOwnPropertyDescriptor types `value` as any; it is confined here by
  // annotating it unknown, and only the validator below narrows it. Reading
  // own properties only also ignores anything on the prototype chain.
  const value: unknown = Object.getOwnPropertyDescriptor(payload, key)?.value

  if (sdkConfigValidators[key](value)) {
    config[key] = value
  }
}

/**
 * Copies only the allowlisted, correctly typed fields out of an untrusted
 * config payload. Anything else — unknown fields, identity keys, or allowlisted
 * fields of the wrong type — is dropped.
 */
export const parseSdkConfig = (payload: unknown): SdkConfig => {
  const config: SdkConfig = {}

  if (typeof payload !== 'object' || payload === null) return config

  for (const key of sdkConfigKeys) {
    copySdkConfigField(config, payload, key)
  }

  return config
}

/**
 * Whether this window is an embedded Chitchatter instance that may take
 * configuration from its parent frame: the `embed` query param must be present
 * and the window must actually be framed. A top-level window has no parent to
 * take configuration from, which is what keeps a page that merely opens
 * Chitchatter from configuring it — and, because embedded instances never
 * persist settings, from writing to the user's own.
 *
 * This does not require `getSdkConfig`. That param only asks for configuration
 * at startup; a framed embed may still receive live updates without it.
 */
export const isSdkConfigurable = (): boolean => {
  const queryParams = new URLSearchParams(window.location.search)

  return queryParams.has(QueryParamKeys.IS_EMBEDDED) && window.parent !== window
}

/**
 * Returns the parent frame's origin as declared by the `parentDomain` query
 * param, or `null` if it is missing or not a valid URL. The embedding page
 * chooses this value, so it only identifies the parent; it does not make the
 * parent trustworthy.
 */
export const getParentFrameOrigin = (): string | null => {
  const queryParams = new URLSearchParams(window.location.search)
  const parentDomain = queryParams.get(QueryParamKeys.PARENT_DOMAIN)

  if (parentDomain === null) return null

  try {
    return new URL(decodeURIComponent(parentDomain)).origin
  } catch {
    return null
  }
}

/**
 * Extracts the SDK configuration from a `config` message, or returns `null` if
 * the message is not one this instance should accept. A message is accepted
 * only when this instance is SDK-configurable, the message was sent by the
 * direct parent frame (not an opener or another frame), its origin matches the
 * declared parent origin, and it is a well-formed `config` message.
 */
export const getSdkConfigFromMessage = (
  event: MessageEvent
): SdkConfig | null => {
  if (!isSdkConfigurable()) return null
  if (event.source !== window.parent) return null

  const parentFrameOrigin = getParentFrameOrigin()

  if (parentFrameOrigin === null) return null
  if (event.origin !== parentFrameOrigin) return null
  if (!isPostMessageEvent(event)) return null
  if (event.data.name !== PostMessageEventName.CONFIG) return null

  return parseSdkConfig(event.data.payload)
}
