import { iframeFeatureAllowList } from '../src/config/iframeFeatureAllowList'

export const defaultRootDomain = 'https://chitchatter.im/'

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
  ROOT_DOMAIN = 'root-domain',
  ROOM_NAME = 'room-name',
}

class ChatEmbed extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')

    const rootDomain =
      this.getAttribute(ChatEmbedAttributes.ROOT_DOMAIN) ?? defaultRootDomain
    const roomName = encodeURIComponent(
      this.getAttribute(ChatEmbedAttributes.ROOM_NAME) ?? window.location.href
    )
    const iframeSrc = `${rootDomain}public/${roomName}/?embed=1`

    iframe.setAttribute('src', iframeSrc)
    iframe.style.border = 'none'

    for (let attributeName of allowedAttributes) {
      const attributeValue = this.getAttribute(attributeName)

      if (attributeValue !== null) {
        iframe.setAttribute(attributeName, attributeValue)
      }
    }

    iframe.setAttribute('allow', iframeFeatureAllowList.join(';'))

    shadow.appendChild(iframe)
  }
}

window.customElements.define('chat-embed', ChatEmbed)
