/**
 * RTC Configuration Hook
 *
 * This hook manages the fetching and merging of WebRTC configuration from multiple sources.
 * It can optionally fetch TURN server configuration from the API and merges it with STUN
 * server configuration from environment variables to create a complete RTCConfiguration.
 * API requests can be disabled for enhanced privacy.
 *
 * ENVIRONMENT CONFIGURATION:
 *
 * Development:
 * - Default: Uses Vite proxy to forward /api requests to localhost:3001 (Vercel dev)
 * - Override: Set VITE_API_BASE_URL to use a different API server (e.g., simple-api-server on port 3003)
 *
 * Production:
 * - Uses relative URLs that resolve to the same domain as the frontend
 * - API endpoints are served by Vercel Functions
 *
 * CONFIGURATION SOURCES:
 * 1. TURN servers: API endpoint (configurable via VITE_RTC_CONFIG_ENDPOINT, defaults to /api/get-config) - OPTIONAL
 * 2. STUN servers: VITE_STUN_SERVERS environment variable (comma-separated URLs)
 * 3. Fallback: Hardcoded TURN and STUN servers if API sources are unavailable or disabled
 *
 * CACHING:
 * - Cached for entire session (staleTime)
 * - Retries once on failure (except for 4xx client errors)
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  isEnhancedConnectivityAvailable,
  getValidatedRtcConfigEndpoint,
} from 'config/enhancedConnectivity'

import { QueryKey } from './types'

const FALLBACK_TURN_SERVER: RTCIceServer = {
  urls: 'turn:relay1.expressturn.com:3478',
  username: 'efQUQ79N77B5BNVVKF',
  credential: 'N4EAUgpjMzPLrxSS',
}

const FALLBACK_STUN_SERVERS: RTCIceServer[] = [
  {
    urls: 'stun:stun.l.google.com:19302',
  },
]

/**
 * Validates if a URL is a valid STUN server URL
 */
const isValidStunUrl = (url: string): boolean => {
  return /^stun:.+:\d+$/.test(url)
}

/**
 * Type guard to validate if an object is a valid RTCIceServer
 *
 * @param obj - Object to validate
 * @returns true if object is a valid RTCIceServer, false otherwise
 */
const isRTCIceServer = (obj: any): obj is RTCIceServer => {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  if (typeof obj.urls !== 'string' && !Array.isArray(obj.urls)) {
    return false
  }

  if (obj.username && typeof obj.username !== 'string') {
    return false
  }

  if (obj.credential && typeof obj.credential !== 'string') {
    return false
  }

  return true
}

/**
 * Gets STUN servers from environment variable or fallback
 *
 * @returns Array of STUN server configurations
 */
const getStunServers = (): RTCIceServer[] => {
  const stunServersEnv = import.meta.env.VITE_STUN_SERVERS

  if (!stunServersEnv) {
    console.log('VITE_STUN_SERVERS not set, using fallback STUN servers')
    return FALLBACK_STUN_SERVERS
  }

  if (typeof stunServersEnv !== 'string') {
    console.error(
      'VITE_STUN_SERVERS must be a string, using fallback STUN servers'
    )
    return FALLBACK_STUN_SERVERS
  }

  const trimmedEnv = stunServersEnv.trim()
  if (!trimmedEnv) {
    console.error('VITE_STUN_SERVERS is empty, using fallback STUN servers')
    return FALLBACK_STUN_SERVERS
  }

  const stunUrls = trimmedEnv
    .split(',')
    .map((url: string) => url.trim())
    .filter((url: string) => {
      if (!url) {
        console.warn('Skipping empty STUN server URL')
        return false
      }
      if (!isValidStunUrl(url)) {
        console.warn(`Skipping invalid STUN server URL: ${url}`)
        return false
      }
      return true
    })

  if (stunUrls.length === 0) {
    console.error(
      'No valid STUN servers found in VITE_STUN_SERVERS, using fallback STUN servers'
    )
    return FALLBACK_STUN_SERVERS
  }

  const stunServers = stunUrls.map((url: string) => ({ urls: url }))

  return stunServers
}

/**
 * Gets the configurable RTC config endpoint from environment variable
 *
 * @returns The API endpoint path (defaults to '/api/get-config')
 */
const getRtcConfigEndpoint = (): string => {
  return getValidatedRtcConfigEndpoint() || '/api/get-config'
}

/**
 * Constructs the API URL based on environment configuration
 *
 * @param endpoint - The API endpoint path (e.g., '/api/get-config')
 * @returns The complete URL to use for the API request
 */
const getApiUrl = (endpoint: string): string => {
  // In development, use environment variable if available, otherwise fall back to relative URL
  if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL}${endpoint}`
  }

  // In production or when no base URL is specified, use relative URL
  // This works with Vite's proxy in development and direct serving in production
  return endpoint
}

/**
 * Fetches TURN server configuration from the API endpoint
 *
 * @returns Promise resolving to RTCIceServer object (TURN server)
 * @throws Error if the API request fails or returns invalid data
 */
const fetchTurnServer = async (): Promise<RTCIceServer> => {
  const endpoint = getRtcConfigEndpoint()
  const apiUrl = getApiUrl(endpoint)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorMessage = `TURN server API request failed: ${response.status} ${response.statusText}`
      console.error(errorMessage)

      // Provide more specific error information
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${errorMessage}`)
      } else if (response.status >= 500) {
        throw new Error(`Server error: ${errorMessage}`)
      }

      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error(
        `TURN server API returned unexpected content type: ${contentType}`
      )
      console.error('Response body:', text.substring(0, 500))
      throw new Error(
        `Invalid response format: expected JSON, got ${contentType}`
      )
    }

    const data = await response.json()

    // Validate the response structure using type guard
    if (!isRTCIceServer(data)) {
      throw new Error(
        'Invalid TURN server response: malformed RTCIceServer object'
      )
    }

    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error fetching TURN server:', error.message)
      throw new Error('Network error: Unable to connect to TURN server API')
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('TURN server request timed out')
      throw new Error('Request timeout: TURN server API did not respond')
    }

    console.error('Error fetching TURN server:', error)
    throw error
  }
}

/**
 * React hook for managing RTC configuration
 *
 * @param enableApiRequest
 * Whether to fetch TURN server config from API (defaults to true). When false,
 * skips API request and uses fallback TURN server
 *
 * @returns Object containing:
 *   - rtcConfig: RTCConfiguration object (merged TURN + STUN servers)
 *   - isLoading: Boolean indicating if the TURN server request is in progress
 *   - isError: Boolean indicating if the TURN server request failed
 *   - error: Error object if the TURN server request failed
 *   - isEnhancedConnectivityAvailable: Boolean indicating if enhanced connectivity feature is available
 */
export const useRtcConfig = (
  enableApiRequest: boolean = true
): {
  rtcConfig: RTCConfiguration
  isLoading: boolean
  isError: boolean
  error: Error | null
} => {
  // Check if enhanced connectivity is available
  const {
    data: turnServer,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QueryKey.TURN_SERVER],
    queryFn: fetchTurnServer,
    enabled: enableApiRequest && isEnhancedConnectivityAvailable,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: (failureCount, retryError) => {
      // Don't retry for client errors (4xx) or timeout errors
      if (
        retryError instanceof Error &&
        (retryError.message.includes('Client error:') ||
          retryError.message.includes('Request timeout:'))
      ) {
        return false
      }

      // Only retry once for other errors
      return failureCount < 1
    },
    retryDelay: 1000, // 1 second delay before retry
  })

  // Get STUN servers from environment
  const stunServers = useMemo(() => getStunServers(), [])

  // Merge TURN server (from API or fallback) with STUN servers
  const rtcConfig = useMemo((): RTCConfiguration => {
    // If enhanced connectivity is not available or not enabled, use fallback
    const effectiveTurnServer =
      isEnhancedConnectivityAvailable && enableApiRequest
        ? turnServer || FALLBACK_TURN_SERVER
        : FALLBACK_TURN_SERVER

    return {
      iceServers: [effectiveTurnServer, ...stunServers],
    }
  }, [turnServer, stunServers, enableApiRequest])

  return {
    rtcConfig,
    isLoading,
    isError,
    error,
  }
}
