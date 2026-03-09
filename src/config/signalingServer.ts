const defaultSignalingServerUrl =
  'wss://chitchatter-signaling.your-domain.workers.dev'

let signalingServerUrl: string = defaultSignalingServerUrl

if (import.meta.env.VITE_SIGNALING_SERVER_URL) {
  signalingServerUrl = import.meta.env.VITE_SIGNALING_SERVER_URL
}

// SFU is opt-in only. Set VITE_SFU_API_BASE to enable.
// Don't auto-derive from signaling URL to avoid unnecessary 400 errors.
const sfuApiBase: string | undefined =
  import.meta.env.VITE_SFU_API_BASE || undefined

export { signalingServerUrl, sfuApiBase }
