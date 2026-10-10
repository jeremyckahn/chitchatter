import { beforeEach, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import persistedStorage from 'localforage'

import { QueryParamKeys } from 'models/shell'
import { userSettingsStorageKey } from 'core/settings/SettingsManager'
import {
  mockSerialization,
  mockSerializedPrivateKey,
  mockSerializedPublicKey,
} from 'test-utils/mocks/mockSerializationService'
import { userSettingsStubFactory } from 'test-utils/stubs/userSettings'

import { DEFAULT_SOUND } from 'config/soundNames'

import Bootstrap, { BootstrapProps } from './Bootstrap'

vi.mock('localforage')

const userSettingsStub = userSettingsStubFactory()

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/')
})

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
  expect(persistedStorage.getItem).toHaveBeenCalledWith(userSettingsStorageKey)
})

test('updates persisted user settings', async () => {
  await renderBootstrap({
    initialUserSettings: { ...userSettingsStub, userId: 'abc123' },
  })

  expect(persistedStorage.setItem).toHaveBeenCalledWith(
    userSettingsStorageKey,
    {
      colorMode: 'dark',
      userId: 'abc123',
      customUsername: '',
      playSoundOnNewMessage: true,
      showNotificationOnNewMessage: true,
      showActiveTypingStatus: true,
      isEnhancedConnectivityEnabled: true,
      publicKey: mockSerializedPublicKey,
      privateKey: mockSerializedPrivateKey,
      selectedSound: DEFAULT_SOUND,
    }
  )
})

test('reads, but never writes, persisted user settings when embedded', async () => {
  window.history.replaceState({}, '', `/?${QueryParamKeys.IS_EMBEDDED}`)

  await renderBootstrap()

  // An embedded instance is a guest in someone else's page. It still reads its
  // own settings — without them it would mint a new identity and keypair on
  // every load of the host page — but the host's configuration is not the
  // user's own, so nothing it computes is saved.
  expect(persistedStorage.getItem).toHaveBeenCalledWith(userSettingsStorageKey)
  expect(persistedStorage.setItem).not.toHaveBeenCalled()
})
