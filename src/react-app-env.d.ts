/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  VITE_HOMEPAGE?: string
  VITE_IS_E2E_TEST?: string
  VITE_SIGNALING_SERVER_URL?: string
  VITE_RTC_CONFIG_ENDPOINT?: string
  VITE_API_BASE_URL?: string
  VITE_STREAMSAVER_URL?: string
  VITE_TRACKER_URL?: string
  VITE_ROUTER_TYPE?: string
  VITE_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
