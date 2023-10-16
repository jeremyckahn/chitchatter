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
}

class ChatEmbed extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')
    const rootDomain =
      this.getAttribute(ChatEmbedAttributes.ROOT_DOMAIN) ?? defaultRootDomain

    iframe.setAttribute('src', rootDomain)
    iframe.style.border = 'none'

    for (let attributeName of allowedAttributes) {
      const attributeValue = this.getAttribute(attributeName)

      if (attributeValue !== null) {
        iframe.setAttribute(attributeName, attributeValue)
      }
    }

    shadow.appendChild(iframe)
  }
}

window.customElements.define('chat-embed', ChatEmbed)
