/**
 * Enhanced Connectivity Configuration
 *
 * This module manages the availability of the Enhanced Connectivity feature
 * based on environment configuration.
 */

/**
 * Validates if the RTC config endpoint is a valid URL path or absolute URL
 */
export const isValidEndpointPath = (endpoint: string): boolean => {
  // First check if it's a valid absolute URL
  try {
    const url = new URL(endpoint)
    // Only allow HTTP and HTTPS protocols
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    // If URL constructor fails, check if it's a valid relative path
    // Should start with / and contain only valid URL path characters
    return /^\/[a-zA-Z0-9\-._~!$&'()*+,;=:@/?]*$/.test(endpoint)
  }
}

/**
 * Gets and validates the RTC config endpoint from environment
 */
export const getRtcConfigEndpoint = (): string | null => {
  const endpoint = import.meta.env.VITE_RTC_CONFIG_ENDPOINT

  if (endpoint === undefined || endpoint === null) {
    return null
  }

  if (typeof endpoint !== 'string') {
    console.error('VITE_RTC_CONFIG_ENDPOINT must be a string')
    return null
  }

  const trimmedEndpoint = endpoint.trim()

  if (!trimmedEndpoint) {
    console.error('VITE_RTC_CONFIG_ENDPOINT cannot be empty')
    return null
  }

  if (!isValidEndpointPath(trimmedEndpoint)) {
    console.error(
      'VITE_RTC_CONFIG_ENDPOINT must be a valid URL path starting with / or a valid absolute URL'
    )
    return null
  }

  return trimmedEndpoint
}

/**
 * Enhanced connectivity availability check
 * This is evaluated once at module load time
 */
export const isEnhancedConnectivityAvailable: boolean = (() => {
  const endpoint = getRtcConfigEndpoint()

  return endpoint !== null
})()

/**
 * Gets the validated RTC config endpoint
 * Returns null if enhanced connectivity is not available
 */
export const getValidatedRtcConfigEndpoint = (): string | null => {
  return isEnhancedConnectivityAvailable ? getRtcConfigEndpoint() : null
}

if (!isEnhancedConnectivityAvailable) {
  console.warn(
    'Enhanced connectivity is not available. To enable this feature, set the VITE_RTC_CONFIG_ENDPOINT environment variable to a valid API endpoint path. ' +
      'See the documentation for more information: https://github.com/jeremyckahn/chitchatter#rtc-configuration-helper-script'
  )
}
