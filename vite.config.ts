/// <reference types="vitest" />
import path from 'path'

import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import macrosPlugin from 'vite-plugin-babel-macros'
import { VitePWA } from 'vite-plugin-pwa'

const srcPaths = [
  'components',
  'config',
  'contexts',
  'lib',
  'models',
  'pages',
  'services',
  'img',
  'utils',
  'test-utils',
]

const srcPathAliases = srcPaths.reduce((acc, dir) => {
  acc[dir] = path.resolve(__dirname, `./src/${dir}`)
  return acc
}, {})

const config = () => {
  return defineConfig({
    build: {
      // NOTE: This isn't really working. At the very least, it's still useful
      // for exposing source code to users.
      // See: https://github.com/vitejs/vite/issues/15012#issuecomment-1956429165
      sourcemap: true,
    },
    plugins: [
      svgr({
        include: '**/*.svg',
      }),
      react(),
      macrosPlugin(),
      nodePolyfills({
        globals: {
          Buffer: true, // can also be 'build', 'dev', or false
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        injectRegister: 'auto',
      }),
    ],
    resolve: {
      alias: {
        webtorrent: fileURLToPath(
          new URL(
            './node_modules/webtorrent/webtorrent.min.js',
            import.meta.url
          )
        ),
        ...srcPathAliases,
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      coverage: {
        reporter: ['text', 'html'],
        exclude: ['node_modules/', 'src/setupTests.ts'],
      },
    },
  })
}

export default config
