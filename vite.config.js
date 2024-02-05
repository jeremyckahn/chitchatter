import path from 'path'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

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
]

const srcPathAliases = srcPaths.reduce((acc, dir) => {
  acc[dir] = path.resolve(__dirname, `./src/${dir}`)
  return acc
}, {})

const config = () => {
  return defineConfig({
    plugins: [svgr(), react()],
    resolve: {
      alias: {
        ...srcPathAliases,
      },
    },
  })
}

export default config
