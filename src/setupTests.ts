import '@testing-library/jest-dom'
import { vi } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './i18n/locales/en.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  initImmediate: false,
})

const silenceConsole = () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
}

silenceConsole()

afterEach(() => {
  vi.restoreAllMocks()
  silenceConsole()
})

vi.mock('secure-file-transfer', () => ({
  __esModule: true,
  FileTransfer: class FileTransfer {
    rescindAll() {}
  },
  setStreamSaverMitm: () => {},
}))
