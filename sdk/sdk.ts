import { iframeFeatureAllowList } from '../src/config/iframeFeatureAllowList'

export const defaultRoot = `${window.location.origin}${window.location.pathname}`

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

class ChatEmbed extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')

    const rootUrl =
      this.getAttribute(ChatEmbedAttributes.ROOT_URL) ?? defaultRoot
    const roomName = encodeURIComponent(
      this.getAttribute(ChatEmbedAttributes.ROOM_NAME) ?? window.location.href
    )
    const iframeSrc = `${rootUrl}public/${roomName}/?embed=1`

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

window.customElements.define('chat-room', ChatEmbed)
