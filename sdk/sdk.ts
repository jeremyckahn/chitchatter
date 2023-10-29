import {
  ChatEmbedAttributes,
  PostMessageEvent,
  PostMessageEventName,
  isPostMessageEvent,
} from '../src/models/sdk'
import { QueryParamKeys } from '../src/models/shell'
import { isColorMode, UserSettings } from '../src/models/settings'
import { iframeFeatureAllowList } from '../src/config/iframeFeatureAllowList'

export const defaultRoot = 'https://chitchatter.im/'

// NOTE: This is a subset of standard iframe attributes:
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attributes
const iframeAttributes = [
  'height',
  'referrerpolicy',
  'sandbox',
  'style',
  'width',
]

const configRequestTimeout = 10_000

class ChatEmbed extends HTMLElement {
  private configRequestExpirationTimout: NodeJS.Timeout | null = null

  private iframe = document.createElement('iframe')

  static get observedAttributes() {
    const chatAttributes = Object.values(ChatEmbedAttributes)

    return [...chatAttributes, ...iframeAttributes]
  }

  get chatConfig() {
    const chatConfig: Partial<UserSettings> = {}

    if (this.hasAttribute(ChatEmbedAttributes.USER_ID)) {
      chatConfig.userId = this.getAttribute(ChatEmbedAttributes.USER_ID) ?? ''
    }

    if (this.hasAttribute(ChatEmbedAttributes.USER_NAME)) {
      chatConfig.customUsername = this.getAttribute(
        ChatEmbedAttributes.USER_NAME
      )!
    }

    chatConfig.playSoundOnNewMessage = Boolean(
      this.hasAttribute(ChatEmbedAttributes.PLAY_MESSAGE_SOUND)
    )

    const colorMode = this.getAttribute(ChatEmbedAttributes.COLOR_MODE) ?? ''

    if (isColorMode(colorMode)) {
      chatConfig.colorMode = colorMode
    }

    return chatConfig
  }

  get rootUrl() {
    return this.getAttribute(ChatEmbedAttributes.ROOT_URL) ?? defaultRoot
  }

  private sendConfigToChat = () => {
    const { iframe, rootUrl } = this
    const { origin: rootUrlOrigin } = new URL(rootUrl)

    const postMessageEventData: PostMessageEvent['data'] = {
      name: PostMessageEventName.CONFIG,
      payload: this.chatConfig,
    }

    iframe.contentWindow?.postMessage(postMessageEventData, rootUrlOrigin)
  }

  private handleConfigRequestedMessage = (event: MessageEvent) => {
    const { rootUrl } = this
    const { origin: rootUrlOrigin } = new URL(rootUrl)

    if (rootUrlOrigin !== event.origin) return
    if (!isPostMessageEvent(event)) return
    if (event.data.name !== PostMessageEventName.CONFIG_REQUESTED) return

    this.sendConfigToChat()
    this.stopListeningForConfigRequest()
  }

  private stopListeningForConfigRequest = () => {
    window.removeEventListener('message', this.handleConfigRequestedMessage)

    if (this.configRequestExpirationTimout !== null) {
      clearInterval(this.configRequestExpirationTimout)
      this.configRequestExpirationTimout = null
    }
  }

  private async listenForConfigRequest() {
    // NOTE: This cancels any pending config request listeners
    this.stopListeningForConfigRequest()

    window.addEventListener('message', this.handleConfigRequestedMessage)

    this.configRequestExpirationTimout = setTimeout(() => {
      console.error(`[chitchatter-sdk] configuration was not sent successfully`)
      this.stopListeningForConfigRequest()
    }, configRequestTimeout)
  }

  private updateIframeAttributes() {
    const { iframe } = this

    const roomName = encodeURIComponent(
      this.getAttribute(ChatEmbedAttributes.ROOM_NAME) ?? window.location.href
    )

    const urlParams = new URLSearchParams({
      [QueryParamKeys.IS_EMBEDDED]: '',
      [QueryParamKeys.GET_SDK_CONFIG]: '',
      [QueryParamKeys.PARENT_DOMAIN]: encodeURIComponent(
        window.location.origin
      ),
    })

    const iframeSrc = new URL(this.rootUrl)
    iframeSrc.pathname = `public/${roomName}`
    iframeSrc.search = urlParams.toString()
    const { href: src } = iframeSrc

    // NOTE: Only update src if the value has changed to avoid reloading the
    // iframe unnecessarily.
    if (src !== iframe.getAttribute('src')) {
      iframe.setAttribute('src', src)
    }

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

    iframe.style.border = 'none'
    iframe.setAttribute('allow', iframeFeatureAllowList.join(';'))
    shadow.appendChild(iframe)

    iframe.addEventListener('load', () => {
      this.listenForConfigRequest()
    })
  }

  disconnectedCallback() {
    this.stopListeningForConfigRequest()
  }

  attributeChangedCallback(name: string) {
    this.updateIframeAttributes()

    const isChatEmbedAttribute = Object.values(ChatEmbedAttributes)
      .map(String) // NOTE: Needed to avoid type warnings.
      .includes(name)

    if (isChatEmbedAttribute) {
      this.sendConfigToChat()
    }
  }
}

window.customElements.define('chat-room', ChatEmbed)
