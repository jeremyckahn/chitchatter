import { UserSettings } from 'models/settings'
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

export interface PostMessageEvent extends MessageEvent {
  data: {
    name: PostMessageEventName
    payload: Record<string, any>
  }
}

export interface ConfigMessageEvent extends PostMessageEvent {
  data: {
    name: PostMessageEventName.CONFIG
    payload: Partial<UserSettings>
  }
}

export const isPostMessageEvent = (
  event: MessageEvent
): event is PostMessageEvent => {
  const { data } = event

  if (typeof data !== 'object' || data === null) return false
  if (!('name' in data && typeof data.name === 'string')) return false
  if (!('payload' in data && typeof data.payload === 'object')) return false

  return true
}

export const isConfigMessageEvent = (
  event: MessageEvent
): event is ConfigMessageEvent => {
  const queryParams = new URLSearchParams(window.location.search)
  const parentDomain = queryParams.get(QueryParamKeys.PARENT_DOMAIN)

  if (parentDomain === null) return false

  const { origin: parentFrameOrigin } = new URL(
    decodeURIComponent(parentDomain)
  )

  if (event.origin !== parentFrameOrigin) return false
  if (!isPostMessageEvent(event)) return false
  if (event.data.name !== PostMessageEventName.CONFIG) return false

  return true
}
