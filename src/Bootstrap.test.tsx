import { afterEach, beforeEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import persistedStorage from 'localforage'

import { QueryParamKeys } from 'models/shell'
import { isPostMessageEvent, PostMessageEventName } from 'models/sdk'
import { userSettingsStorageKey } from 'core/settings/SettingsManager'
import { getPeerName } from 'core/names/peerNames'
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

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
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

describe('SDK configuration', () => {
  const parentOrigin = 'https://host.example'

  const sdkQueryString = new URLSearchParams({
    [QueryParamKeys.IS_EMBEDDED]: '',
    [QueryParamKeys.GET_SDK_CONFIG]: '',
    [QueryParamKeys.PARENT_DOMAIN]: encodeURIComponent(parentOrigin),
  }).toString()

  // A real, distinct Window stands in for the embedding page.
  const createParentWindow = (): Window => {
    const iframe = document.createElement('iframe')

    document.body.appendChild(iframe)

    const { contentWindow } = iframe

    if (contentWindow === null) throw new Error('iframe has no window')

    return contentWindow
  }

  const postConfig = (source: Window, payload: unknown) => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { name: PostMessageEventName.CONFIG, payload },
        origin: parentOrigin,
        source,
      })
    )
  }

  // Answers the app's configRequested message with the given payload, the
  // way the SDK's <chat-room /> element does.
  const respondToConfigRequests = (parentWindow: Window, payload: unknown) => {
    vi.spyOn(parentWindow, 'postMessage').mockImplementation(
      (message: unknown) => {
        const event = new MessageEvent('message', { data: message })

        if (!isPostMessageEvent(event)) return
        if (event.data.name !== PostMessageEventName.CONFIG_REQUESTED) return

        postConfig(parentWindow, payload)
      }
    )
  }

  test('applies the allowlisted config from the parent frame', async () => {
    const parentWindow = createParentWindow()

    vi.spyOn(window, 'parent', 'get').mockReturnValue(parentWindow)
    window.history.replaceState({}, '', `/?${sdkQueryString}`)
    respondToConfigRequests(parentWindow, {
      customUsername: 'Alice',
      userId: 'sdk-user',
    })
    const serializeSpy = vi.spyOn(mockSerialization, 'serializeUserSettings')

    await renderBootstrap()

    await waitFor(() => {
      expect(serializeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ customUsername: 'Alice', userId: 'sdk-user' })
      )
    })
  })

  test('never takes identity keys from the parent frame', async () => {
    const parentWindow = createParentWindow()

    vi.spyOn(window, 'parent', 'get').mockReturnValue(parentWindow)
    window.history.replaceState({}, '', `/?${sdkQueryString}`)
    const attackerKeys = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )

    respondToConfigRequests(parentWindow, {
      customUsername: 'Alice',
      publicKey: attackerKeys.publicKey,
      privateKey: attackerKeys.privateKey,
    })
    const serializeSpy = vi.spyOn(mockSerialization, 'serializeUserSettings')

    await renderBootstrap()

    await waitFor(() => {
      expect(serializeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ customUsername: 'Alice' })
      )
    })

    for (const [settings] of serializeSpy.mock.calls) {
      expect(settings.publicKey).not.toBe(attackerKeys.publicKey)
      expect(settings.privateKey).not.toBe(attackerKeys.privateKey)
    }
  })

  test('applies live config to a framed embed without getSdkConfig', async () => {
    // getSdkConfig only requests config at startup. A hand-built embed that
    // omits it still takes live config updates from its parent frame.
    const parentWindow = createParentWindow()

    vi.spyOn(window, 'parent', 'get').mockReturnValue(parentWindow)
    const queryParams = new URLSearchParams(sdkQueryString)

    queryParams.delete(QueryParamKeys.GET_SDK_CONFIG)
    window.history.replaceState({}, '', `/?${queryParams}`)
    const parentPostMessageSpy = vi.spyOn(parentWindow, 'postMessage')

    await renderBootstrap()
    await screen.findAllByText(getPeerName(userSettingsStub.userId))

    act(() => {
      postConfig(parentWindow, { userId: 'sdk-user' })
    })

    expect(
      await screen.findAllByText(getPeerName('sdk-user'))
    ).not.toHaveLength(0)
    expect(parentPostMessageSpy).not.toHaveBeenCalled()
  })

  test('ignores config posted to a top-level window', async () => {
    // A page that opens Chitchatter in a new window controls its URL and can
    // post to it, but must not be able to configure it: without the embed
    // param, the instance persists its settings as the user's own.
    const queryParams = new URLSearchParams(sdkQueryString)

    queryParams.delete(QueryParamKeys.IS_EMBEDDED)
    window.history.replaceState({}, '', `/?${queryParams}`)
    const postMessageSpy = vi.spyOn(window, 'postMessage')
    const sendConfig = () => postConfig(window, { customUsername: 'Mallory' })
    const configInterval = setInterval(sendConfig, 0)

    try {
      await renderBootstrap()

      await waitFor(() => {
        expect(persistedStorage.setItem).toHaveBeenCalled()
      })
    } finally {
      clearInterval(configInterval)
    }

    expect(postMessageSpy).not.toHaveBeenCalled()
    expect(persistedStorage.setItem).not.toHaveBeenCalledWith(
      userSettingsStorageKey,
      expect.objectContaining({ customUsername: 'Mallory' })
    )
  })

  // Posts config from `source` until settings have been computed, then
  // returns every settings object the app computed along the way.
  const renderWhilePostingConfig = async (source: Window) => {
    const serializeSpy = vi.spyOn(mockSerialization, 'serializeUserSettings')
    const sendConfig = () => postConfig(source, { customUsername: 'Mallory' })
    const configInterval = setInterval(sendConfig, 0)

    try {
      await renderBootstrap()

      await waitFor(() => {
        expect(serializeSpy).toHaveBeenCalled()
      })
    } finally {
      clearInterval(configInterval)
    }

    return serializeSpy.mock.calls.map(([settings]) => settings)
  }

  test('ignores config in a top-level window even with every SDK param', async () => {
    // Isolates the framed-window check: the URL carries embed, getSdkConfig
    // and parentDomain, but there is no parent frame to take config from.
    window.history.replaceState({}, '', `/?${sdkQueryString}`)
    const postMessageSpy = vi.spyOn(window, 'postMessage')

    const computedSettings = await renderWhilePostingConfig(window)

    expect(postMessageSpy).not.toHaveBeenCalled()
    for (const settings of computedSettings) {
      expect(settings.customUsername).not.toBe('Mallory')
    }
  })

  test('ignores config in a framed window without the embed param', async () => {
    // Isolates the embed check: the window is framed and the message comes
    // from its parent, but without embed the instance persists its settings
    // as the user's own, so the parent must not configure it.
    const parentWindow = createParentWindow()

    vi.spyOn(window, 'parent', 'get').mockReturnValue(parentWindow)
    const queryParams = new URLSearchParams(sdkQueryString)

    queryParams.delete(QueryParamKeys.IS_EMBEDDED)
    window.history.replaceState({}, '', `/?${queryParams}`)
    const parentPostMessageSpy = vi.spyOn(parentWindow, 'postMessage')

    const computedSettings = await renderWhilePostingConfig(parentWindow)

    expect(parentPostMessageSpy).not.toHaveBeenCalled()
    for (const settings of computedSettings) {
      expect(settings.customUsername).not.toBe('Mallory')
    }
    expect(persistedStorage.setItem).not.toHaveBeenCalledWith(
      userSettingsStorageKey,
      expect.objectContaining({ customUsername: 'Mallory' })
    )
  })
})
