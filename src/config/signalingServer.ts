const defaultSignalingServerUrl =
  'wss://chitchatter-signaling.your-domain.workers.dev'

let signalingServerUrl: string = defaultSignalingServerUrl

if (import.meta.env.VITE_SIGNALING_SERVER_URL) {
  signalingServerUrl = import.meta.env.VITE_SIGNALING_SERVER_URL
}

const deriveSfuApiBase = (): string | undefined => {
  if (import.meta.env.VITE_SFU_API_BASE) {
    return import.meta.env.VITE_SFU_API_BASE
  }

  // Derive from signaling server URL (same Worker handles both)
  const httpUrl = signalingServerUrl
    .replace('wss://', 'https://')
    .replace('ws://', 'http://')

  return httpUrl || undefined
}

const sfuApiBase: string | undefined = deriveSfuApiBase()

export { signalingServerUrl, sfuApiBase }
