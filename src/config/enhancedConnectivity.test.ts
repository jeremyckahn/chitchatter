import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

describe('enhancedConnectivity', () => {
  let originalEnv: any

  beforeEach(() => {
    // Store original environment
    originalEnv = import.meta.env
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original environment
    Object.assign(import.meta.env, originalEnv)
    vi.resetModules()
  })

  describe('isValidEndpointPath', () => {
    test('accepts valid relative paths', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('/api/get-config')).toBe(true)
    })

    test('accepts valid relative paths with parameters', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('/api/get-config?param=value')).toBe(true)
    })

    test('accepts valid relative paths with complex characters', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('/api/get-config/test-123_456.json')).toBe(
        true
      )
    })

    test('accepts valid absolute HTTP URLs', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('http://example.com/api/get-config')).toBe(
        true
      )
    })

    test('accepts valid absolute HTTPS URLs', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('https://api.example.com/get-config')).toBe(
        true
      )
    })

    test('accepts valid absolute URLs with ports', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(
        isValidEndpointPath('https://api.example.com:8080/get-config')
      ).toBe(true)
    })

    test('accepts valid absolute URLs with query parameters', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(
        isValidEndpointPath(
          'https://api.example.com/get-config?version=1&format=json'
        )
      ).toBe(true)
    })

    test('rejects paths not starting with / or valid protocol', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('api/get-config')).toBe(false)
    })

    test('rejects invalid protocols', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('ftp://example.com/api/get-config')).toBe(
        false
      )
    })

    test('rejects malformed URLs', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('https://[invalid-url')).toBe(false)
    })

    test('rejects empty string', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('')).toBe(false)
    })

    test('rejects whitespace-only string', async () => {
      const { isValidEndpointPath } = await import('./enhancedConnectivity')
      expect(isValidEndpointPath('   ')).toBe(false)
    })
  })

  describe('getRtcConfigEndpoint', () => {
    test('returns null when environment variable is not set', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = undefined
      const { getRtcConfigEndpoint } = await import('./enhancedConnectivity')
      expect(getRtcConfigEndpoint()).toBe(null)
    })

    test('returns validated endpoint when set to valid path', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = '/api/get-config'
      const { getRtcConfigEndpoint } = await import('./enhancedConnectivity')
      expect(getRtcConfigEndpoint()).toBe('/api/get-config')
    })

    test('returns validated endpoint when set to valid URL', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT =
        'https://api.example.com/get-config'
      const { getRtcConfigEndpoint } = await import('./enhancedConnectivity')
      expect(getRtcConfigEndpoint()).toBe('https://api.example.com/get-config')
    })

    test('trims whitespace from endpoint', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = '  /api/get-config  '
      const { getRtcConfigEndpoint } = await import('./enhancedConnectivity')
      expect(getRtcConfigEndpoint()).toBe('/api/get-config')
    })

    test('logs error and returns null for non-string value', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = 123 as any
      vi.resetModules()
      const { getRtcConfigEndpoint } = await import('./enhancedConnectivity')
      expect(getRtcConfigEndpoint()).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith(
        'VITE_RTC_CONFIG_ENDPOINT must be a valid URL path starting with / or a valid absolute URL'
      )
      consoleSpy.mockRestore()
    })

    test('logs error and returns null for empty string', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = ''
      vi.resetModules()
      const { getRtcConfigEndpoint } = await import('./enhancedConnectivity')
      expect(getRtcConfigEndpoint()).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith(
        'VITE_RTC_CONFIG_ENDPOINT cannot be empty'
      )
      consoleSpy.mockRestore()
    })

    test('logs error and returns null for invalid endpoint', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = 'invalid-endpoint'
      vi.resetModules()
      const { getRtcConfigEndpoint } = await import('./enhancedConnectivity')
      expect(getRtcConfigEndpoint()).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith(
        'VITE_RTC_CONFIG_ENDPOINT must be a valid URL path starting with / or a valid absolute URL'
      )
      consoleSpy.mockRestore()
    })
  })

  describe('module-level constants', () => {
    test('isEnhancedConnectivityAvailable is true when valid endpoint is set', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = '/api/get-config'
      vi.resetModules()
      const { isEnhancedConnectivityAvailable } = await import(
        './enhancedConnectivity'
      )
      expect(isEnhancedConnectivityAvailable).toBe(true)
    })

    test('isEnhancedConnectivityAvailable is false when no endpoint is set', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = undefined
      vi.resetModules()
      const { isEnhancedConnectivityAvailable } = await import(
        './enhancedConnectivity'
      )
      expect(isEnhancedConnectivityAvailable).toBe(false)
    })

    test('isEnhancedConnectivityAvailable is false when invalid endpoint is set', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = 'invalid-endpoint'
      vi.resetModules()
      const { isEnhancedConnectivityAvailable } = await import(
        './enhancedConnectivity'
      )
      expect(isEnhancedConnectivityAvailable).toBe(false)
    })

    test('getValidatedRtcConfigEndpoint returns endpoint when enhanced connectivity is available', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = '/api/get-config'
      vi.resetModules()
      const { getValidatedRtcConfigEndpoint } = await import(
        './enhancedConnectivity'
      )
      expect(getValidatedRtcConfigEndpoint()).toBe('/api/get-config')
    })

    test('getValidatedRtcConfigEndpoint returns null when enhanced connectivity is not available', async () => {
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = undefined
      vi.resetModules()
      const { getValidatedRtcConfigEndpoint } = await import(
        './enhancedConnectivity'
      )
      expect(getValidatedRtcConfigEndpoint()).toBe(null)
    })

    test('logs warning when enhanced connectivity is not available', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      import.meta.env.VITE_RTC_CONFIG_ENDPOINT = undefined
      vi.resetModules()
      await import('./enhancedConnectivity')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Enhanced connectivity is not available. To enable this feature, set the VITE_RTC_CONFIG_ENDPOINT environment variable to a valid API endpoint path. ' +
          'See the documentation for more information: https://github.com/jeremyckahn/chitchatter#rtc-configuration-helper-script'
      )
      consoleSpy.mockRestore()
    })
  })
})
