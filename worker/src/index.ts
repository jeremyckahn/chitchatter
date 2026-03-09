import { SignalingRoom } from './SignalingRoom'
import type { RTCConfiguration, RTCIceServer } from './rtc-types'

export { SignalingRoom }

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace
  RTC_CONFIG?: string
  CORS_ALLOW_ALL?: string
}

const allowedOrigins = [
  'https://chitchatter.im',
  'http://localhost:3000',
  'http://localhost:5173',
]

const getCorsHeaders = (request: Request, env: Env): Record<string, string> => {
  const origin = request.headers.get('Origin') || ''

  if (env.CORS_ALLOW_ALL === 'true') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
    }
  }

  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
  }
}

const isValidIceServerUrl = (url: string): boolean => {
  return /^(turn|turns):.+/.test(url)
}

const isValidRTCConfiguration = (
  data: Record<string, unknown>
): data is RTCConfiguration => {
  if (!data || typeof data !== 'object') return false
  if (!Array.isArray(data.iceServers)) return false
  if (data.iceServers.length === 0) return false

  for (const server of data.iceServers) {
    if (!server || typeof server !== 'object') return false
    if (!server.urls) return false

    const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
    if (
      !urls.every(
        (url: unknown) => typeof url === 'string' && isValidIceServerUrl(url)
      )
    ) {
      return false
    }
  }
  return true
}

const extractTurnServer = (
  rtcConfig: RTCConfiguration
): RTCIceServer | null => {
  if (!rtcConfig.iceServers) return null

  for (const server of rtcConfig.iceServers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
    if (urls.some((url: string) => url.startsWith('turn:'))) {
      return server
    }
  }
  return null
}

const getTurnServer = (rtcConfigEnv?: string): RTCIceServer | null => {
  if (!rtcConfigEnv || !rtcConfigEnv.trim()) return null

  try {
    const decoded = atob(rtcConfigEnv)
    const parsed = JSON.parse(decoded)

    if (!isValidRTCConfiguration(parsed)) return null

    return extractTurnServer(parsed as RTCConfiguration)
  } catch {
    return null
  }
}

const handleGetConfig = (request: Request, env: Env): Response => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(request, env),
      },
    })
  }

  const turnServer = getTurnServer(env.RTC_CONFIG)

  if (!turnServer) {
    return new Response(
      JSON.stringify({ error: 'No TURN server configured' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request, env),
        },
      }
    )
  }

  return new Response(JSON.stringify(turnServer), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request, env),
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env),
      })
    }

    if (url.pathname === '/api/get-config') {
      return handleGetConfig(request, env)
    }

    const roomMatch = url.pathname.match(/^\/room\/(.+)$/)
    if (roomMatch) {
      const roomId = decodeURIComponent(roomMatch[1])
      const id = env.SIGNALING_ROOM.idFromName(roomId)
      const room = env.SIGNALING_ROOM.get(id)
      return room.fetch(request)
    }

    return new Response('Not Found', { status: 404 })
  },
}
