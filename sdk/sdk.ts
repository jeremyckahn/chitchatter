import { QueryParamKeys } from '../src/models/shell'
import { iframeFeatureAllowList } from '../src/config/iframeFeatureAllowList'

export const defaultRoot = 'https://chitchatter.im/'

// NOTE: This is a subset of standard iframe attributes:
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attributes
const allowedAttributes = [
  'height',
  'referrerpolicy',
  'sandbox',
  'style',
  'width',
]

enum ChatEmbedAttributes {
  ROOT_URL = 'root-url',
  ROOM_NAME = 'room',
}

const pollInterval = 250
const pollTimeout = 3000

class ChatEmbed extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')

    const rootUrl =
      this.getAttribute(ChatEmbedAttributes.ROOT_URL) ?? defaultRoot
    const roomName = encodeURIComponent(
      this.getAttribute(ChatEmbedAttributes.ROOM_NAME) ?? window.location.href
    )

    const iframeSrc = new URL(rootUrl)
    iframeSrc.pathname = `public/${roomName}`

    const urlParams = new URLSearchParams({
      [QueryParamKeys.IS_EMBEDDED]: '',
      [QueryParamKeys.WAIT_FOR_CONFIG]: '',
      [QueryParamKeys.PARENT_DOMAIN]: encodeURIComponent(
        window.location.origin
      ),
    })
    iframeSrc.search = urlParams.toString()

    iframe.setAttribute('src', iframeSrc.href)
    iframe.style.border = 'none'

    for (let attributeName of allowedAttributes) {
      const attributeValue = this.getAttribute(attributeName)

      if (attributeValue !== null) {
        iframe.setAttribute(attributeName, attributeValue)
      }
    }

    iframe.setAttribute('allow', iframeFeatureAllowList.join(';'))

    shadow.appendChild(iframe)
    this.sendConfigToChat(iframe, rootUrl)
  }

  private async sendConfigToChat(chat: HTMLIFrameElement, rootUrl: string) {
    let timer: NodeJS.Timer
    const { origin: rootUrlOrigin } = new URL(rootUrl)

    // FIXME: Use types for posted data
    const handleMessageReceived = (event: MessageEvent) => {
      if (rootUrlOrigin !== event.origin) return

      if (event.data?.name === 'configReceived') {
        clearInterval(timer)
        window.removeEventListener('message', handleMessageReceived)
      }
    }

    window.addEventListener('message', handleMessageReceived)

    timer = setInterval(() => {
      chat.contentWindow?.postMessage(
        {
          name: 'config',
          payload: {},
        },
        rootUrlOrigin
      )
    }, pollInterval)

    setTimeout(() => {
      clearInterval(timer)
    }, pollTimeout)
  }
}

window.customElements.define('chat-room', ChatEmbed)
