/**
 * RTC Configuration Hook
 *
 * This hook manages the fetching and merging of WebRTC configuration from multiple sources.
 * It can optionally fetch TURN server configuration from the API.
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
 * 2. No fallback servers - only configured servers are used
 *
 * CACHING:
 * - Cached for entire session (staleTime)
 * - Retries once on failure (except for 4xx client errors)
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { consoleLogger } from 'adapters/web'
import {
  isEnhancedConnectivityAvailable,
  getValidatedRtcConfigEndpoint,
} from 'config/enhancedConnectivity'
import {
  fetchTurnServer,
  isRetriableTurnServerError,
} from 'core/config/turnConfig'

import { QueryKey } from './types'

/**
 * Gets the configurable RTC config endpoint from environment variable
 *
 * @returns The API endpoint path (defaults to '/api/get-config')
 */
const getRtcConfigEndpoint = (): string => {
  return getValidatedRtcConfigEndpoint() || '/api/get-config'
}

/**
 * Constructs the API URL based on environment configuration.
 *
 * This stays in the web layer: where the endpoint lives is a Vite/Vercel
 * deployment detail, and `src/core` may not read `import.meta.env`.
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
 * React hook for managing RTC configuration
 *
 * @param enableApiRequest
 * Whether to fetch TURN server config from API (defaults to true). When false,
 * skips API request and uses fallback TURN server
 *
 * @returns Object containing:
 *   - rtcConfig: RTCConfiguration object
 *   - isLoading: Boolean indicating if the TURN server request is in progress
 *   - isError: Boolean indicating if the TURN server request failed
 *   - error: Error object if the TURN server request failed
 *   - isEnhancedConnectivityAvailable: Boolean indicating if enhanced connectivity feature is available
 */
export const useTurnConfig = (
  enableApiRequest: boolean = true
): {
  turnConfig: RTCConfiguration
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
    queryFn: () =>
      fetchTurnServer(getApiUrl(getRtcConfigEndpoint()), {
        logger: consoleLogger,
      }),
    enabled: enableApiRequest && isEnhancedConnectivityAvailable,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: (failureCount, retryError) =>
      isRetriableTurnServerError(retryError) && failureCount < 1,
    retryDelay: 1000, // 1 second delay before retry
  })

  // Merge TURN server from API
  const turnConfig = useMemo((): RTCConfiguration => {
    const iceServers: RTCIceServer[] = []

    // Only include TURN server if we have one from API
    if (isEnhancedConnectivityAvailable && enableApiRequest && turnServer) {
      iceServers.push(turnServer)
    }

    return {
      iceServers,
    }
  }, [turnServer, enableApiRequest])

  return {
    turnConfig,
    isLoading,
    isError,
    error,
  }
}
