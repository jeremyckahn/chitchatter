// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

afterEach(() => {
  jest.restoreAllMocks()
})

jest.mock('create-torrent', () => ({
  __esModule: true,
  default: () => {},
}))

jest.mock('parse-torrent', () => ({
  __esModule: true,
  default: async () => {},
}))

jest.mock('webtorrent', () => ({
  __esModule: true,
  default: class WebTorrent {},
}))

jest.mock('wormhole-crypto', () => ({
  __esModule: true,
  Keychain: class Keychain {},
}))
