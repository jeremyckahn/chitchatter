import { act, render } from '@testing-library/react'
import localforage from 'localforage'

import { PersistedStorageKeys } from 'models/storage'
import {
  mockSerializationService,
  mockSerializedPrivateKey,
  mockSerializedPublicKey,
} from 'test-utils/mocks/mockSerializationService'
import { userSettingsStubFactory } from 'test-utils/stubs/userSettings'

import Bootstrap, { BootstrapProps } from './Bootstrap'

const mockPersistedStorage =
  jest.createMockFromModule<jest.Mock<typeof localforage>>('localforage')

const mockGetItem = jest.fn()
const mockSetItem = jest.fn()

const userSettingsStub = userSettingsStubFactory()

beforeEach(() => {
  mockGetItem.mockImplementation(() => Promise.resolve(null))
  mockSetItem.mockImplementation((data: any) => Promise.resolve(data))
})

const renderBootstrap = async (overrides: Partial<BootstrapProps> = {}) => {
  Object.assign(mockPersistedStorage, {
    getItem: mockGetItem,
    setItem: mockSetItem,
  })

  render(
    <Bootstrap
      persistedStorage={mockPersistedStorage as any as typeof localforage}
      initialUserSettings={userSettingsStub}
      serializationService={mockSerializationService}
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

test('updates persisted user settings', async () => {
  await renderBootstrap({
    initialUserSettings: { ...userSettingsStub, userId: 'abc123' },
  })

  expect(mockSetItem).toHaveBeenCalledWith(PersistedStorageKeys.USER_SETTINGS, {
    colorMode: 'dark',
    userId: 'abc123',
    customUsername: '',
    playSoundOnNewMessage: true,
    showNotificationOnNewMessage: true,
    showActiveTypingStatus: true,
    publicKey: mockSerializedPublicKey,
    privateKey: mockSerializedPrivateKey,
  })
})
