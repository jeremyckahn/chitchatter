import { vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import { useRtcConfig } from './useRtcConfig'

// Mock the enhanced connectivity config module
const mockEnhancedConnectivity = vi.hoisted(() => ({
  isEnhancedConnectivityAvailable: true,
  getValidatedRtcConfigEndpoint: (): string | null => '/api/get-config',
}))
vi.mock('config/enhancedConnectivity', () => mockEnhancedConnectivity)

const mockTurnServer = {
  urls: 'turn:relay1.expressturn.com:3478',
  username: 'efQUQ79N77B5BNVVKF',
  credential: 'N4EAUgpjMzPLrxSS',
}

const expectedRtcConfig = {
  iceServers: [
    {
      urls: 'turn:relay1.expressturn.com:3478',
      username: 'efQUQ79N77B5BNVVKF',
      credential: 'N4EAUgpjMzPLrxSS',
    },
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
      },
    },
  })

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useRtcConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock environment variable for STUN servers
    vi.stubEnv('VITE_STUN_SERVERS', 'stun:stun.l.google.com:19302')
    // Reset mock to true by default
    mockEnhancedConnectivity.isEnhancedConnectivityAvailable = true
    mockEnhancedConnectivity.getValidatedRtcConfigEndpoint = () =>
      '/api/get-config'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  test('fetches TURN server and merges with STUN servers successfully', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
    expect(global.fetch).toHaveBeenCalledWith('/api/get-config', {
      signal: expect.any(AbortSignal),
      headers: {
        Accept: 'application/json',
      },
    })
  })

  test('always provides merged config immediately with fallback TURN server', () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    // Should always have merged config available immediately (fallback TURN + env STUN)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API fails', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API returns non-200 status', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API returns non-JSON content', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('text/html'),
      },
      text: vi.fn().mockResolvedValue('<html>Error page</html>'),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API returns invalid RTCIceServer object (not an object)', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(null),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API returns invalid RTCIceServer object (missing urls)', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue({
        username: 'testuser',
        credential: 'testpass',
      }),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API returns invalid RTCIceServer object (invalid urls type)', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue({
        urls: 12345,
        username: 'testuser',
        credential: 'testpass',
      }),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API returns invalid RTCIceServer object (invalid username type)', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue({
        urls: 'turn:relay1.expressturn.com:3478',
        username: 12345,
        credential: 'testpass',
      }),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses fallback TURN server when API returns invalid RTCIceServer object (invalid credential type)', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue({
        urls: 'turn:relay1.expressturn.com:3478',
        username: 'testuser',
        credential: 12345,
      }),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('accepts valid RTCIceServer object with urls as array', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    const validTurnServerWithArray = {
      urls: [
        'turn:relay1.expressturn.com:3478',
        'turn:relay2.expressturn.com:3478',
      ],
      username: 'testuser',
      credential: 'testpass',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(validTurnServerWithArray),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.rtcConfig.iceServers).toBeDefined()
    expect(result.current.rtcConfig.iceServers![0]).toEqual(
      validTurnServerWithArray
    )
  })

  test('accepts valid RTCIceServer object with minimal properties (only urls)', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    const minimalTurnServer = {
      urls: 'turn:relay1.expressturn.com:3478',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(minimalTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.rtcConfig.iceServers).toBeDefined()
    expect(result.current.rtcConfig.iceServers![0]).toEqual(minimalTurnServer)
  })

  test('calls API with correct endpoint', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/get-config', {
      signal: expect.any(AbortSignal),
      headers: {
        Accept: 'application/json',
      },
    })
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses custom RTC config endpoint from environment variable', async () => {
    vi.stubEnv('VITE_RTC_CONFIG_ENDPOINT', '/api/custom-rtc-config')
    mockEnhancedConnectivity.getValidatedRtcConfigEndpoint = ():
      | string
      | null => '/api/custom-rtc-config'

    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/custom-rtc-config', {
      signal: expect.any(AbortSignal),
      headers: {
        Accept: 'application/json',
      },
    })
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses absolute URL RTC config endpoint from environment variable', async () => {
    vi.stubEnv('VITE_RTC_CONFIG_ENDPOINT', 'https://api.example.com/rtc-config')
    mockEnhancedConnectivity.getValidatedRtcConfigEndpoint = ():
      | string
      | null => 'https://api.example.com/rtc-config'

    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/rtc-config',
      {
        signal: expect.any(AbortSignal),
        headers: {
          Accept: 'application/json',
        },
      }
    )
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('uses custom STUN servers from environment variable', () => {
    vi.stubEnv(
      'VITE_STUN_SERVERS',
      'stun:custom.stun.com:19302,stun:another.stun.com:3478'
    )

    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    const expectedConfigWithCustomStun = {
      iceServers: [
        mockTurnServer,
        { urls: 'stun:custom.stun.com:19302' },
        { urls: 'stun:another.stun.com:3478' },
      ],
    }

    expect(result.current.rtcConfig).toEqual(expectedConfigWithCustomStun)
  })

  test('uses fallback STUN servers when environment variable is not set', () => {
    vi.stubEnv('VITE_STUN_SERVERS', undefined)

    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('skips API request when enableApiRequest is false', () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(false), { wrapper })

    // Should not make API request
    expect(global.fetch).not.toHaveBeenCalled()

    // Should immediately provide config with fallback TURN server
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })

  test('enhanced connectivity is not available when VITE_RTC_CONFIG_ENDPOINT is not set', () => {
    // Mock the constant to be false for this test
    mockEnhancedConnectivity.isEnhancedConnectivityAvailable = false
    mockEnhancedConnectivity.getValidatedRtcConfigEndpoint = ():
      | string
      | null => null

    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useRtcConfig(), { wrapper })

    // Should not make API request
    expect(global.fetch).not.toHaveBeenCalled()

    // Should immediately provide config with fallback TURN server
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.rtcConfig).toEqual(expectedRtcConfig)
  })
})
