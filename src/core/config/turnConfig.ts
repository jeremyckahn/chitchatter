import { LoggerAdapter } from 'core/adapters/types'

/**
 * Validates an object as an {@link RTCIceServer}.
 *
 * The TURN credentials come from a network response, so they are untrusted
 * input: a malformed `iceServers` entry breaks WebRTC in ways that are hard to
 * trace back to their source.
 */
export const isRTCIceServer = (obj: any): obj is RTCIceServer => {
  if (!obj || typeof obj !== 'object') return false

  if (typeof obj.urls !== 'string' && !Array.isArray(obj.urls)) return false

  if (obj.username && typeof obj.username !== 'string') return false

  if (obj.credential && typeof obj.credential !== 'string') return false

  return true
}

export const turnServerRequestTimeout = 10_000

/**
 * Fetches and validates TURN server configuration.
 *
 * Takes the URL rather than deriving it, because where the endpoint lives is a
 * deployment concern the host knows about and the core does not.
 *
 * Error messages are prefixed `Client error:` / `Server error:` /
 * `Request timeout:` so that callers can decide what is worth retrying without
 * inspecting a status code they never saw.
 */
export const fetchTurnServer = async (
  apiUrl: string,
  {
    logger,
    timeoutMs = turnServerRequestTimeout,
  }: { logger: LoggerAdapter; timeoutMs?: number }
): Promise<RTCIceServer> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorMessage = `TURN server API request failed: ${response.status} ${response.statusText}`

      logger.error(errorMessage)

      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${errorMessage}`)
      }

      if (response.status >= 500) {
        throw new Error(`Server error: ${errorMessage}`)
      }

      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()

      logger.error(
        `TURN server API returned unexpected content type: ${contentType}`
      )
      logger.error('Response body:', text.substring(0, 500))

      throw new Error(
        `Invalid response format: expected JSON, got ${contentType}`
      )
    }

    const data = await response.json()

    if (!isRTCIceServer(data)) {
      throw new Error(
        'Invalid TURN server response: malformed RTCIceServer object'
      )
    }

    return data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logger.error('Network error fetching TURN server:', error.message)
      throw new Error('Network error: Unable to connect to TURN server API')
    }

    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('TURN server request timed out')
      throw new Error('Request timeout: TURN server API did not respond')
    }

    logger.error('Error fetching TURN server:', error)
    throw error
  }
}

/** Whether a TURN fetch failure is worth retrying. */
export const isRetriableTurnServerError = (error: unknown) =>
  !(
    error instanceof Error &&
    (error.message.includes('Client error:') ||
      error.message.includes('Request timeout:'))
  )
