import { isPostMessageEvent, PostMessageEventName } from '../src/models/sdk'
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

enum ChatEmbedAttributes {
  COLOR_MODE = 'color-mode',
  PLAY_MESSAGE_SOUND = 'play-message-sound',
  ROOM_NAME = 'room',
  ROOT_URL = 'root-url',
  USER_ID = 'user-id',
  USER_NAME = 'user-name',
}

const pollInterval = 250
const pollTimeout = 10_000

class ChatEmbed extends HTMLElement {
  private sendConfigTimer: NodeJS.Timer | undefined

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

    if (this.hasAttribute(ChatEmbedAttributes.USER_NAME)) {
      chatConfig.customUsername =
        this.getAttribute(ChatEmbedAttributes.USER_NAME) ?? ''
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

    iframe.contentWindow?.postMessage(
      {
        name: PostMessageEventName.CONFIG,
        payload: this.chatConfig,
      },
      rootUrlOrigin
    )
  }

  private handleMessage = (event: MessageEvent) => {
    const { rootUrl } = this

    const { origin: rootUrlOrigin } = new URL(rootUrl)
    if (rootUrlOrigin !== event.origin) return
    if (!isPostMessageEvent(event)) return
    if (event.data.name !== PostMessageEventName.CONFIG_RECEIVED) return

    this.stopSendingConfig()
  }

  private async sendConfigUntilReceived() {
    window.addEventListener('message', this.handleMessage)

    this.sendConfigTimer = setInterval(this.sendConfigToChat, pollInterval)

    setTimeout(() => {
      if (this.sendConfigTimer === undefined) return

      console.error(`[chitchatter-sdk] configuration was not sent successfully`)
      this.stopSendingConfig()
    }, pollTimeout)
  }

  private stopSendingConfig = () => {
    clearInterval(this.sendConfigTimer)
    this.sendConfigTimer = undefined
    window.removeEventListener('message', this.handleMessage)
  }

  private updateIframeAttributes() {
    const { iframe } = this

    const roomName = encodeURIComponent(
      this.getAttribute(ChatEmbedAttributes.ROOM_NAME) ?? window.location.href
    )

    const urlParams = new URLSearchParams({
      [QueryParamKeys.IS_EMBEDDED]: '',
      [QueryParamKeys.WAIT_FOR_CONFIG]: '',
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

    const chatConfig: Partial<UserSettings> = {}

    if (this.hasAttribute(ChatEmbedAttributes.USER_ID)) {
      chatConfig.userId = this.getAttribute(ChatEmbedAttributes.USER_ID) ?? ''
    }

    this.sendConfigUntilReceived()
  }

  disconnectedCallback() {
    this.stopSendingConfig()
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
