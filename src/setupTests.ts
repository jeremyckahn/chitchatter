// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

afterEach(() => {
  jest.restoreAllMocks()
})

jest.mock('secure-file-transfer', () => ({
  __esModule: true,
  FileTransfer: class FileTransfer {
    rescindAll() {}
  },
  setStreamSaverMitm: () => {},
}))
