/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_HOMEPAGE?: string
  readonly VITE_IS_E2E_TEST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
