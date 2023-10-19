import { isPostMessageEvent, PostMessageEventName } from '../src/models/sdk'
import { QueryParamKeys } from '../src/models/shell'
import { UserSettings } from '../src/models/settings'
import { iframeFeatureAllowList } from '../src/config/iframeFeatureAllowList'

export const defaultRoot = 'https://chitchatter.im/'

// NOTE: This is a subset of standard iframe attributes:
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attributes
// FIXME: Change this to be an enum
const iframeAttributes = [
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
const pollTimeout = 10_000

class ChatEmbed extends HTMLElement {
  private iframe = document.createElement('iframe')

  static get observedAttributes() {
    const chatAttributes = Object.values(ChatEmbedAttributes)
    const iframeAttributes = ['height', 'width']

    return [...chatAttributes, ...iframeAttributes]
  }

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

  private sendConfigToChat = () => {
    const { iframe, rootUrl } = this
    const { origin: rootUrlOrigin } = new URL(rootUrl)

    iframe.contentWindow?.postMessage(
      {
        name: PostMessageEventName.CONFIG,
        payload: this.chatConfig,
      },
      rootUrlOrigin
    )
  }

  private async sendConfigToChatAndWaitForConfirmation() {
    const { rootUrl } = this

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

    timer = setInterval(this.sendConfigToChat, pollInterval)

    setTimeout(() => {
      clearInterval(timer)
    }, pollTimeout)
  }

  private updateIframeAttributes() {
    const { iframe } = this

    for (let attributeName of iframeAttributes) {
      const attributeValue = this.getAttribute(attributeName)

      if (attributeValue !== null) {
        iframe.setAttribute(attributeName, attributeValue)
      }
    }
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

    this.updateIframeAttributes()
    iframe.setAttribute('allow', iframeFeatureAllowList.join(';'))

    shadow.appendChild(iframe)

    const chatConfig: Partial<UserSettings> = {}

    if (this.hasAttribute(ChatEmbedAttributes.USER_ID)) {
      chatConfig.userId = this.getAttribute(ChatEmbedAttributes.USER_ID) ?? ''
    }

    this.sendConfigToChatAndWaitForConfirmation()
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    // FIXME: Handle room name change
    const isIframeAttribute = iframeAttributes.includes(name)

    if (isIframeAttribute) {
      this.updateIframeAttributes()
    } else {
      this.sendConfigToChat()
    }
  }
}

window.customElements.define('chat-room', ChatEmbed)
