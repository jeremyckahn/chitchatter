export enum PostMessageEventName {
  CONFIG = 'config',
  CONFIG_REQUESTED = 'configRequested',
}

export interface PostMessageEvent extends MessageEvent {
  data: {
    name: PostMessageEventName
    payload: Record<string, any>
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
