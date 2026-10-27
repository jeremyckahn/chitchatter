import { afterEach, beforeEach, vi } from 'vitest'

import { ColorMode } from 'core/models/settings'
import { QueryParamKeys } from 'models/shell'

import {
  getParentFrameOrigin,
  getSdkConfigFromMessage,
  isPostMessageEvent,
  IgnoredSdkConfigReason,
  isSdkConfigurable,
  parseSdkConfig,
  PostMessageEventName,
} from './sdk'

const parentOrigin = 'https://host.example'

const sdkQueryString = new URLSearchParams({
  [QueryParamKeys.IS_EMBEDDED]: '',
  [QueryParamKeys.GET_SDK_CONFIG]: '',
  [QueryParamKeys.PARENT_DOMAIN]: encodeURIComponent(parentOrigin),
}).toString()

// A real, distinct Window stands in for the embedding page so that the
// framed-window and message-source checks run against genuine objects.
const createParentWindow = (): Window => {
  const iframe = document.createElement('iframe')

  document.body.appendChild(iframe)

  const { contentWindow } = iframe

  if (contentWindow === null) throw new Error('iframe has no window')

  return contentWindow
}

const createConfigEvent = ({
  source,
  origin = parentOrigin,
  payload = { customUsername: 'Alice' },
  name = PostMessageEventName.CONFIG,
}: {
  source: Window | null
  origin?: string
  payload?: unknown
  name?: string
}) =>
  new MessageEvent('message', {
    data: { name, payload },
    origin,
    source,
  })

let parentWindow: Window

beforeEach(() => {
  parentWindow = createParentWindow()
  vi.spyOn(window, 'parent', 'get').mockReturnValue(parentWindow)
  window.history.replaceState({}, '', `/?${sdkQueryString}`)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  window.history.replaceState({}, '', '/')
})

describe('parseSdkConfig', () => {
  test('keeps every allowlisted field of the right type', () => {
    expect(
      parseSdkConfig({
        colorMode: ColorMode.LIGHT,
        customUsername: 'Alice',
        playSoundOnNewMessage: true,
        userId: 'user-1',
      })
    ).toEqual({
      config: {
        colorMode: ColorMode.LIGHT,
        customUsername: 'Alice',
        playSoundOnNewMessage: true,
        userId: 'user-1',
      },
      ignored: [],
    })
  })

  test('drops identity keys and any other field outside the allowlist', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )

    expect(
      parseSdkConfig({
        customUsername: 'Alice',
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        isEnhancedConnectivityEnabled: true,
        selectedSound: 'evil.mp3',
      })
    ).toEqual({
      config: { customUsername: 'Alice' },
      ignored: [
        { key: 'publicKey', reason: IgnoredSdkConfigReason.KEY_NOT_ALLOWED },
        { key: 'privateKey', reason: IgnoredSdkConfigReason.KEY_NOT_ALLOWED },
        {
          key: 'isEnhancedConnectivityEnabled',
          reason: IgnoredSdkConfigReason.KEY_NOT_ALLOWED,
        },
        {
          key: 'selectedSound',
          reason: IgnoredSdkConfigReason.KEY_NOT_ALLOWED,
        },
      ],
    })
  })

  test('drops allowlisted fields of the wrong type', () => {
    expect(
      parseSdkConfig({
        colorMode: 'purple',
        customUsername: 42,
        playSoundOnNewMessage: 'yes',
        userId: { id: 'user-1' },
      })
    ).toEqual({
      config: {},
      ignored: [
        { key: 'colorMode', reason: IgnoredSdkConfigReason.INVALID_VALUE },
        { key: 'customUsername', reason: IgnoredSdkConfigReason.INVALID_VALUE },
        {
          key: 'playSoundOnNewMessage',
          reason: IgnoredSdkConfigReason.INVALID_VALUE,
        },
        { key: 'userId', reason: IgnoredSdkConfigReason.INVALID_VALUE },
      ],
    })
  })

  test('does not report allowlisted fields that are simply absent', () => {
    expect(parseSdkConfig({}).ignored).toEqual([])
  })

  test.each([null, undefined, 'config', 7])(
    'returns an empty config for a non-object payload (%s)',
    payload => {
      expect(parseSdkConfig(payload)).toEqual({ config: {}, ignored: [] })
    }
  )
})

describe('isPostMessageEvent', () => {
  test('rejects an unknown event name', () => {
    expect(
      isPostMessageEvent(
        new MessageEvent('message', { data: { name: 'other', payload: {} } })
      )
    ).toBe(false)
  })

  test('rejects a null payload', () => {
    expect(
      isPostMessageEvent(
        new MessageEvent('message', {
          data: { name: PostMessageEventName.CONFIG, payload: null },
        })
      )
    ).toBe(false)
  })
})

describe('isSdkConfigurable', () => {
  test('is true for a framed window with the SDK query params', () => {
    expect(isSdkConfigurable()).toBe(true)
  })

  test('is false for a top-level window', () => {
    vi.spyOn(window, 'parent', 'get').mockReturnValue(window)

    expect(isSdkConfigurable()).toBe(false)
  })

  test('is false without the embed query param', () => {
    const queryParams = new URLSearchParams(sdkQueryString)

    queryParams.delete(QueryParamKeys.IS_EMBEDDED)
    window.history.replaceState({}, '', `/?${queryParams}`)

    expect(isSdkConfigurable()).toBe(false)
  })

  test('does not require the getSdkConfig query param', () => {
    // getSdkConfig only requests configuration at startup; a framed embed
    // without it may still receive live config updates from its parent.
    const queryParams = new URLSearchParams(sdkQueryString)

    queryParams.delete(QueryParamKeys.GET_SDK_CONFIG)
    window.history.replaceState({}, '', `/?${queryParams}`)

    expect(isSdkConfigurable()).toBe(true)
  })
})

describe('getParentFrameOrigin', () => {
  test('returns the origin of the parentDomain query param', () => {
    expect(getParentFrameOrigin()).toBe(parentOrigin)
  })

  test('returns null when parentDomain is missing', () => {
    window.history.replaceState({}, '', '/')

    expect(getParentFrameOrigin()).toBeNull()
  })

  test('returns null when parentDomain is not a URL', () => {
    window.history.replaceState(
      {},
      '',
      `/?${QueryParamKeys.PARENT_DOMAIN}=not-a-url`
    )

    expect(getParentFrameOrigin()).toBeNull()
  })
})

describe('getSdkConfigFromMessage', () => {
  test('returns the parsed config from the parent frame', () => {
    expect(
      getSdkConfigFromMessage(createConfigEvent({ source: parentWindow }))
    ).toEqual({ customUsername: 'Alice' })
  })

  test('strips identity keys from an otherwise valid message', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    )

    expect(
      getSdkConfigFromMessage(
        createConfigEvent({
          source: parentWindow,
          payload: {
            userId: 'user-1',
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
          },
        })
      )
    ).toEqual({ userId: 'user-1' })
  })

  test('warns, by key and never value, about the fields it ignored', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(
      getSdkConfigFromMessage(
        createConfigEvent({
          source: parentWindow,
          payload: { colorMode: 'Dark', publicKey: 'secret-value' },
        })
      )
    ).toEqual({})

    expect(warnSpy).toHaveBeenCalledTimes(1)
    const warning = warnSpy.mock.calls[0].join(' ')

    expect(warning).toContain('colorMode (invalid value)')
    expect(warning).toContain('publicKey (key not allowed)')
    expect(warning).not.toContain('secret-value')
  })

  test('does not warn when every field is accepted', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    getSdkConfigFromMessage(createConfigEvent({ source: parentWindow }))

    expect(warnSpy).not.toHaveBeenCalled()
  })

  test('ignores a message from a window other than the parent', () => {
    // E.g. an opener or a sibling frame that knows the declared origin.
    const otherWindow = createParentWindow()

    expect(
      getSdkConfigFromMessage(createConfigEvent({ source: otherWindow }))
    ).toBeNull()
  })

  test('ignores a message whose origin does not match parentDomain', () => {
    expect(
      getSdkConfigFromMessage(
        createConfigEvent({
          source: parentWindow,
          origin: 'https://evil.example',
        })
      )
    ).toBeNull()
  })

  test('ignores a message that is not a config message', () => {
    expect(
      getSdkConfigFromMessage(
        createConfigEvent({
          source: parentWindow,
          name: PostMessageEventName.CONFIG_REQUESTED,
        })
      )
    ).toBeNull()
  })

  test('ignores every message in a top-level window', () => {
    // A page that opens Chitchatter in a new window can name itself as the
    // parent and post to it, but the opened window has no parent frame.
    vi.spyOn(window, 'parent', 'get').mockReturnValue(window)

    expect(
      getSdkConfigFromMessage(createConfigEvent({ source: window }))
    ).toBeNull()
  })

  test('ignores every message without the embed query param', () => {
    const queryParams = new URLSearchParams(sdkQueryString)

    queryParams.delete(QueryParamKeys.IS_EMBEDDED)
    window.history.replaceState({}, '', `/?${queryParams}`)

    expect(
      getSdkConfigFromMessage(createConfigEvent({ source: parentWindow }))
    ).toBeNull()
  })
})
