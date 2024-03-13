import { vi } from 'vitest'
import { act, render } from '@testing-library/react'
import persistedStorage from 'localforage'

import { PersistedStorageKeys } from 'models/storage'
import {
  mockSerialization,
  mockSerializedPrivateKey,
  mockSerializedPublicKey,
} from 'test-utils/mocks/mockSerializationService'
import { userSettingsStubFactory } from 'test-utils/stubs/userSettings'

import Bootstrap, { BootstrapProps } from './Bootstrap'

vi.mock('localforage')

const userSettingsStub = userSettingsStubFactory()

const renderBootstrap = async (overrides: Partial<BootstrapProps> = {}) => {
  render(
    <Bootstrap
      persistedStorage={persistedStorage}
      initialUserSettings={userSettingsStub}
      serializationService={mockSerialization}
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
  expect(persistedStorage.getItem).toHaveBeenCalledWith(
    PersistedStorageKeys.USER_SETTINGS
  )
})

test('updates persisted user settings', async () => {
  await renderBootstrap({
    initialUserSettings: { ...userSettingsStub, userId: 'abc123' },
  })

  expect(persistedStorage.setItem).toHaveBeenCalledWith(
    PersistedStorageKeys.USER_SETTINGS,
    {
      colorMode: 'dark',
      userId: 'abc123',
      customUsername: '',
      playSoundOnNewMessage: true,
      showNotificationOnNewMessage: true,
      showActiveTypingStatus: true,
      publicKey: mockSerializedPublicKey,
      privateKey: mockSerializedPrivateKey,
    }
  )
})
