import { isPostMessageEvent, PostMessageEventName } from '../src/models/sdk'
import { QueryParamKeys } from '../src/models/shell'
import { UserSettings } from '../src/models/settings'
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
  USER_ID = 'user-id',
}

const pollInterval = 250
const pollTimeout = 3000

class ChatEmbed extends HTMLElement {
  private iframe = document.createElement('iframe')

  get chatConfig() {
    const chatConfig: Partial<UserSettings> = {}

    if (this.hasAttribute(ChatEmbedAttributes.USER_ID)) {
      chatConfig.userId = this.getAttribute(ChatEmbedAttributes.USER_ID) ?? ''
    }

    return chatConfig
  }

  get rootUrl() {
    return this.getAttribute(ChatEmbedAttributes.ROOT_URL) ?? defaultRoot
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const { iframe } = this

    const roomName = encodeURIComponent(
      this.getAttribute(ChatEmbedAttributes.ROOM_NAME) ?? window.location.href
    )

    const iframeSrc = new URL(this.rootUrl)
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

    const chatConfig: Partial<UserSettings> = {}

    if (this.hasAttribute(ChatEmbedAttributes.USER_ID)) {
      chatConfig.userId = this.getAttribute(ChatEmbedAttributes.USER_ID) ?? ''
    }

    this.sendConfigToChat()
  }

  private async sendConfigToChat() {
    const { iframe, rootUrl } = this

    let timer: NodeJS.Timer
    const { origin: rootUrlOrigin } = new URL(rootUrl)

    const handleMessageReceived = (event: MessageEvent) => {
      if (rootUrlOrigin !== event.origin) return
      if (!isPostMessageEvent(event)) return
      if (event.data.name !== PostMessageEventName.CONFIG_RECEIVED) return

      clearInterval(timer)
      window.removeEventListener('message', handleMessageReceived)
    }

    window.addEventListener('message', handleMessageReceived)

    timer = setInterval(() => {
      iframe.contentWindow?.postMessage(
        {
          name: PostMessageEventName.CONFIG,
          payload: this.chatConfig,
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
