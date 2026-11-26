import { PostMessageEventName } from '../src/models/sdk'
import { itemAt } from '../src/test-utils/itemAt'

import './sdk'

const rootUrl = 'https://chitchatter.example/'
const rootUrlOrigin = new URL(rootUrl).origin

const createChatRoom = (userName: string) => {
  const chatRoom = document.createElement('chat-room')
  chatRoom.setAttribute('root-url', rootUrl)
  chatRoom.setAttribute('user-name', userName)
  document.body.appendChild(chatRoom)

  const iframe = chatRoom.shadowRoot?.querySelector('iframe')

  if (!iframe) {
    throw new Error('Expected the chat-room to render an iframe')
  }

  // NOTE: jsdom does not create a browsing context for an iframe inside a
  // shadow root, so a window from a throwaway iframe stands in for it.
  const windowHost = document.createElement('iframe')
  document.body.appendChild(windowHost)

  const { contentWindow } = windowHost

  if (!contentWindow) {
    throw new Error('Expected jsdom to create a window for the iframe')
  }

  Object.defineProperty(iframe, 'contentWindow', { get: () => contentWindow })

  const postMessage = vi
    .spyOn(contentWindow, 'postMessage')
    .mockImplementation(() => {})

  // NOTE: The element starts listening for config requests once its iframe
  // has loaded.
  iframe.dispatchEvent(new Event('load'))

  return { chatRoom, contentWindow, postMessage }
}

const requestConfigFrom = (source: Window) => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { name: PostMessageEventName.CONFIG_REQUESTED, payload: {} },
      origin: rootUrlOrigin,
      source,
    })
  )
}

describe('chat-room', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  test('answers a config request only from its own iframe', () => {
    const a = createChatRoom('User A')
    const b = createChatRoom('User B')

    requestConfigFrom(b.contentWindow)

    expect(a.postMessage).not.toHaveBeenCalled()
    expect(b.postMessage).toHaveBeenCalledTimes(1)
    expect(itemAt(b.postMessage.mock.calls, 0)).toEqual([
      {
        name: PostMessageEventName.CONFIG,
        payload: { customUsername: 'User B', playSoundOnNewMessage: false },
      },
      rootUrlOrigin,
    ])

    // A stray request from B must not make A give up listening for its own.
    requestConfigFrom(a.contentWindow)

    expect(a.postMessage).toHaveBeenCalledTimes(1)
    expect(itemAt(a.postMessage.mock.calls, 0)).toEqual([
      {
        name: PostMessageEventName.CONFIG,
        payload: { customUsername: 'User A', playSoundOnNewMessage: false },
      },
      rootUrlOrigin,
    ])
  })
})
