/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_GITHUB_REPO?: string
  readonly VITE_HOMEPAGE?: string
  readonly VITE_IS_E2E_TEST?: string
  readonly VITE_ROUTER_TYPE?: string
  readonly VITE_RTC_CONFIG_ENDPOINT?: string
  readonly VITE_STREAMSAVER_URL?: string
  readonly VITE_TRACKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
