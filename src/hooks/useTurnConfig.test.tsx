import { vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import { useTurnConfig } from './useTurnConfig'

// Mock the enhanced connectivity config module
const mockEnhancedConnectivity = vi.hoisted(() => ({
  isEnhancedConnectivityAvailable: true,
  getValidatedRtcConfigEndpoint: (): string | null => '/api/get-config',
}))
vi.mock('config/enhancedConnectivity', () => mockEnhancedConnectivity)

const mockTurnServer = {
  urls: ['turn:relay1.expressturn.com:3478'],
  username: 'efQUQ79N77B5BNVVKF',
  credential: 'N4EAUgpjMzPLrxSS',
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

describe('useTurnConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock to true by default
    mockEnhancedConnectivity.isEnhancedConnectivityAvailable = true
    mockEnhancedConnectivity.getValidatedRtcConfigEndpoint = () =>
      '/api/get-config'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('fetches TURN server successfully', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(mockTurnServer),
    })

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.turnConfig).toEqual({
      iceServers: [mockTurnServer],
    })
    expect(global.fetch).toHaveBeenCalledWith('/api/get-config', {
      signal: expect.any(AbortSignal),
      headers: {
        Accept: 'application/json',
      },
    })
  })

  test('returns empty iceServers when API fails', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.turnConfig).toEqual({ iceServers: [] })
  })

  test('returns empty iceServers when API returns non-200 status', async () => {
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

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.turnConfig).toEqual({ iceServers: [] })
  })

  test('returns empty iceServers when API returns non-JSON content', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('text/html'),
      },
      text: vi.fn().mockResolvedValue('<html>Error page</html>'),
    })

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.turnConfig).toEqual({ iceServers: [] })
  })

  test('returns empty iceServers when API returns invalid RTCIceServer object', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(null),
    })

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.turnConfig).toEqual({ iceServers: [] })
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

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.turnConfig.iceServers).toBeDefined()
    expect(result.current.turnConfig.iceServers![0]).toEqual(
      validTurnServerWithArray
    )
  })

  test('accepts valid RTCIceServer object with minimal properties (only urls)', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    const minimalTurnServer = {
      urls: ['turn:relay1.expressturn.com:3478'],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue(minimalTurnServer),
    })

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.turnConfig.iceServers).toBeDefined()
    expect(result.current.turnConfig.iceServers![0]).toEqual(minimalTurnServer)
  })

  test('uses custom RTC config endpoint from environment variable', async () => {
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

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/custom-rtc-config', {
      signal: expect.any(AbortSignal),
      headers: {
        Accept: 'application/json',
      },
    })
    expect(result.current.turnConfig).toEqual({
      iceServers: [mockTurnServer],
    })
  })

  test('uses absolute URL RTC config endpoint from environment variable', async () => {
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

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

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
    expect(result.current.turnConfig).toEqual({
      iceServers: [mockTurnServer],
    })
  })

  test('skips API request when enableApiRequest is false', () => {
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn()

    const { result } = renderHook(() => useTurnConfig(false), { wrapper })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.turnConfig).toEqual({ iceServers: [] })
  })

  test('skips API request when enhanced connectivity is not available', () => {
    mockEnhancedConnectivity.isEnhancedConnectivityAvailable = false

    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(queryClient)

    global.fetch = vi.fn()

    const { result } = renderHook(() => useTurnConfig(), { wrapper })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.turnConfig).toEqual({ iceServers: [] })
  })
})
