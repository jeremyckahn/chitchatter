import { act, render } from '@testing-library/react'
import localforage from 'localforage'

import { PersistedStorageKeys } from 'models/storage'

import Bootstrap, { BootstrapProps } from './Bootstrap'

const mockPersistedStorage =
  jest.createMockFromModule<jest.Mock<typeof localforage>>('localforage')

const mockGetUuid = jest.fn()

const mockGetItem = jest.fn()
const mockSetItem = jest.fn()

beforeEach(() => {
  mockGetItem.mockImplementation(() => Promise.resolve(null))
  mockSetItem.mockImplementation((data: any) => Promise.resolve(data))
})

const renderBootstrap = async (overrides: BootstrapProps = {}) => {
  Object.assign(mockPersistedStorage, {
    getItem: mockGetItem,
    setItem: mockSetItem,
  })

  render(
    <Bootstrap
      persistedStorage={mockPersistedStorage as any as typeof localforage}
      {...overrides}
    />
  )

  // https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning#an-alternative-waiting-for-the-mocked-promise
  await act(async () => {
    await Promise.resolve()
  })
}

test('renders', async () => {
  await renderBootstrap()
})

test('checks persistedStorage for user settings', async () => {
  await renderBootstrap()
  expect(mockGetItem).toHaveBeenCalledWith(PersistedStorageKeys.USER_SETTINGS)
})

test('persists user settings if none were already persisted', async () => {
  await renderBootstrap({
    getUuid: mockGetUuid.mockImplementation(() => 'abc123'),
  })

  expect(mockSetItem).toHaveBeenCalledWith(PersistedStorageKeys.USER_SETTINGS, {
    colorMode: 'dark',
    userId: 'abc123',
    customUsername: '',
    playSoundOnNewMessage: true,
    showNotificationOnNewMessage: true,
  })
})

test('does not update user settings if they were already persisted', async () => {
  mockGetItem.mockImplementation(() => ({
    userId: 'abc123',
  }))

  await renderBootstrap()

  expect(mockSetItem).not.toHaveBeenCalled()
})
