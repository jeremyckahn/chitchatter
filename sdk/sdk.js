export const rootDomain = 'https://chitchatter.im/'

class Chitchatter extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')

    iframe.setAttribute('src', rootDomain)
    iframe.style.border = 'none'

    for (let attributeName of this.getAttributeNames()) {
      iframe.setAttribute(attributeName, this.getAttribute(attributeName))
    }

    shadow.appendChild(iframe)
  }
}

window.customElements.define('chat-embed', Chitchatter)
