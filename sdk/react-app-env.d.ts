/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_HOMEPAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
