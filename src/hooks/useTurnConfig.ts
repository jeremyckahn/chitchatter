/**
 * RTC Configuration Hook
 *
 * Fetches TURN server credentials and SFU availability from the Worker API.
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
  sfuEnabled?: boolean
}

interface TurnConfigResult {
  iceServers: RTCIceServer[]
  sfuEnabled: boolean
}

const isValidTurnResponse = (data: unknown): data is TurnResponse => {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.iceServers)) return false
  return true
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

const fetchTurnConfig = async (): Promise<TurnConfigResult> => {
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
      throw new Error(`TURN API: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (isValidTurnResponse(data)) {
      return {
        iceServers: data.iceServers,
        sfuEnabled: !!data.sfuEnabled,
      }
    }

    return { iceServers: [], sfuEnabled: false }
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
  sfuEnabled: boolean
  isLoading: boolean
  isError: boolean
  error: Error | null
} => {
  const {
    data: turnResult,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [QueryKey.TURN_SERVER],
    queryFn: fetchTurnConfig,
    enabled: enableApiRequest && isEnhancedConnectivityAvailable,
    staleTime: 12 * 60 * 60 * 1000,
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

    if (isEnhancedConnectivityAvailable && enableApiRequest && turnResult) {
      iceServers.push(...turnResult.iceServers)
    }

    return { iceServers }
  }, [turnResult, enableApiRequest])

  const sfuEnabled = turnResult?.sfuEnabled ?? false

  return {
    turnConfig,
    sfuEnabled,
    isLoading,
    isError,
    error,
  }
}
