import { SignalingRoom } from './SignalingRoom'

export { SignalingRoom }

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace
  TURN_KEY_ID?: string
  TURN_KEY_API_TOKEN?: string
  CORS_ALLOW_ALL?: string
}

const allowedOrigins = [
  'https://chitchatter.im',
  'http://localhost:3000',
  'http://localhost:5173',
]

const TURN_CREDENTIAL_TTL = 86400

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

interface CloudflareTurnResponse {
  iceServers: Array<{
    urls: string[]
    username?: string
    credential?: string
  }>
}

const generateCloudflareTurnCredentials = async (
  env: Env
): Promise<CloudflareTurnResponse | null> => {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) {
    return null
  }

  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: TURN_CREDENTIAL_TTL }),
      }
    )

    if (!response.ok) {
      console.error(
        `Cloudflare TURN API error: ${response.status} ${response.statusText}`
      )
      return null
    }

    const data = (await response.json()) as CloudflareTurnResponse

    if (!data.iceServers || !Array.isArray(data.iceServers)) {
      console.error('Invalid Cloudflare TURN response format')
      return null
    }

    // Filter out port 53 URLs (blocked by browsers)
    const filtered: CloudflareTurnResponse = {
      iceServers: data.iceServers.map(server => ({
        ...server,
        urls: server.urls.filter((url: string) => !url.includes(':53')),
      })),
    }

    return filtered
  } catch (error) {
    console.error('Failed to generate Cloudflare TURN credentials:', error)
    return null
  }
}

const handleGetConfig = async (
  request: Request,
  env: Env
): Promise<Response> => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(request, env),
      },
    })
  }

  const turnData = await generateCloudflareTurnCredentials(env)

  if (!turnData) {
    return new Response(
      JSON.stringify({ error: 'TURN service not configured' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request, env),
        },
      }
    )
  }

  // Return the full iceServers array from Cloudflare
  return new Response(JSON.stringify(turnData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${Math.floor(TURN_CREDENTIAL_TTL / 2)}`,
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
