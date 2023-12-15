import path from 'path'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const srcPaths = [
  'components',
  'config',
  'contexts',
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
    plugins: [react()],
    resolve: {
      alias: {
        ...srcPathAliases,
      },
    },
  })
}

export default config
