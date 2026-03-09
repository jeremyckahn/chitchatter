const defaultSignalingServerUrl =
  'wss://chitchatter-signaling.your-domain.workers.dev'

let signalingServerUrl: string = defaultSignalingServerUrl

if (import.meta.env.VITE_SIGNALING_SERVER_URL) {
  signalingServerUrl = import.meta.env.VITE_SIGNALING_SERVER_URL
}

export { signalingServerUrl }
