/**
 * RTC Configuration Hook
 *
 * Fetches TURN server credentials from the Cloudflare Worker API.
 * The Worker generates short-lived Cloudflare TURN credentials on each request.
 *
 * Response format from Cloudflare TURN:
 * { iceServers: [{ urls: [...] }, { urls: [...], username, credential }] }
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  isEnhancedConnectivityAvailable,
  getValidatedRtcConfigEndpoint,
} from 'config/enhancedConnectivity'

import { QueryKey } from './types'

interface TurnResponse {
  iceServers: RTCIceServer[]
}

const isValidTurnResponse = (data: unknown): data is TurnResponse => {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.iceServers)) return false

  return obj.iceServers.every(
    (server: unknown) =>
      server &&
      typeof server === 'object' &&
      'urls' in (server as Record<string, unknown>)
  )
}

const getRtcConfigEndpoint = (): string => {
  return getValidatedRtcConfigEndpoint() || '/api/get-config'
}

const getApiUrl = (endpoint: string): string => {
  if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL}${endpoint}`
  }
  return endpoint
}

const fetchTurnConfig = async (): Promise<RTCIceServer[]> => {
  const endpoint = getRtcConfigEndpoint()
  const apiUrl = getApiUrl(endpoint)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorMessage = `TURN API request failed: ${response.status} ${response.statusText}`
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${errorMessage}`)
      }
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(
        `Invalid response format: expected JSON, got ${contentType}`
      )
    }

    const data = await response.json()

    if (isValidTurnResponse(data)) {
      return data.iceServers
    }

    // Fallback: single RTCIceServer object (legacy format)
    if (data && typeof data === 'object' && 'urls' in data) {
      return [data as RTCIceServer]
    }

    throw new Error('Invalid TURN response format')
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout: TURN API did not respond')
    }
    throw error
  }
}

export const useTurnConfig = (
  enableApiRequest: boolean = true
): {
  turnConfig: RTCConfiguration
  isLoading: boolean
  isError: boolean
  error: Error | null
} => {
  const {
    data: turnIceServers,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QueryKey.TURN_SERVER],
    queryFn: fetchTurnConfig,
    enabled: enableApiRequest && isEnhancedConnectivityAvailable,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours (credentials TTL is 24h)
    gcTime: Infinity,
    retry: (failureCount, retryError) => {
      if (
        retryError instanceof Error &&
        (retryError.message.includes('Client error:') ||
          retryError.message.includes('Request timeout:'))
      ) {
        return false
      }
      return failureCount < 1
    },
    retryDelay: 1000,
  })

  const turnConfig = useMemo((): RTCConfiguration => {
    const iceServers: RTCIceServer[] = []

    if (isEnhancedConnectivityAvailable && enableApiRequest && turnIceServers) {
      iceServers.push(...turnIceServers)
    }

    return { iceServers }
  }, [turnIceServers, enableApiRequest])

  return {
    turnConfig,
    isLoading,
    isError,
    error,
  }
}
