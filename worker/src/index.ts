import { SignalingRoom } from './SignalingRoom'

export { SignalingRoom }

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace
  TURN_KEY_ID?: string
  TURN_KEY_API_TOKEN?: string
  SFU_APP_ID?: string
  SFU_APP_SECRET?: string
  ALLOWED_ORIGINS?: string
}

const TURN_CREDENTIAL_TTL = 86400
const SFU_API_BASE = 'https://rtc.live.cloudflare.com/v1'

const getCorsHeaders = (request: Request, env: Env): Record<string, string> => {
  const origin = request.headers.get('Origin') || ''

  // Parse allowed origins from env (comma-separated) or use defaults
  const customOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : []

  const isAllowed =
    origin === 'http://localhost:3000' ||
    origin === 'http://localhost:5173' ||
    origin.endsWith('.pages.dev') ||
    origin.endsWith('.workers.dev') ||
    customOrigins.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection',
  }
}

// ─── TURN ───────────────────────────────────────────────

interface CloudflareTurnResponse {
  iceServers: Array<{
    urls: string[]
    username?: string
    credential?: string
  }>
}

const generateTurnCredentials = async (
  env: Env
): Promise<CloudflareTurnResponse | null> => {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return null

  try {
    const resp = await fetch(
      `${SFU_API_BASE}/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: TURN_CREDENTIAL_TTL }),
      }
    )
    if (!resp.ok) return null

    const data = (await resp.json()) as CloudflareTurnResponse
    if (!data.iceServers) return null

    return {
      iceServers: data.iceServers.map(s => ({
        ...s,
        urls: s.urls.filter((u: string) => !u.includes(':53')),
      })),
    }
  } catch {
    return null
  }
}

const handleGetConfig = async (
  request: Request,
  env: Env
): Promise<Response> => {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, request, env)
  }

  const turnData = await generateTurnCredentials(env)

  const hasSfu = !!(env.SFU_APP_ID && env.SFU_APP_SECRET)

  if (!turnData) {
    return jsonResponse(
      { iceServers: [], sfuEnabled: hasSfu },
      200,
      request,
      env
    )
  }

  return new Response(JSON.stringify({ ...turnData, sfuEnabled: hasSfu }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${Math.floor(TURN_CREDENTIAL_TTL / 2)}`,
      ...getCorsHeaders(request, env),
    },
  })
}

// ─── SFU ────────────────────────────────────────────────

const sfuProxy = async (
  request: Request,
  env: Env,
  sfuPath: string
): Promise<Response> => {
  if (!env.SFU_APP_ID || !env.SFU_APP_SECRET) {
    return jsonResponse({ error: 'SFU not configured' }, 503, request, env)
  }

  const body = request.method !== 'GET' ? await request.text() : undefined

  try {
    const resp = await fetch(
      `${SFU_API_BASE}/apps/${env.SFU_APP_ID}/${sfuPath}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${env.SFU_APP_SECRET}`,
          'Content-Type': 'application/json',
        },
        body,
      }
    )

    const data = await resp.text()

    return new Response(data, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(request, env),
      },
    })
  } catch {
    return jsonResponse({ error: 'SFU proxy error' }, 502, request, env)
  }
}

// ─── Helpers ────────────────────────────────────────────

const jsonResponse = (
  data: Record<string, unknown>,
  status: number,
  request: Request,
  env: Env
): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request, env),
    },
  })
}

// ─── Router ─────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env),
      })
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ status: 'ok' }, 200, request, env)
    }

    // TURN + SFU availability config
    if (url.pathname === '/api/get-config') {
      return handleGetConfig(request, env)
    }

    // SFU endpoints
    if (url.pathname === '/sfu/sessions/new' && request.method === 'POST') {
      return sfuProxy(request, env, 'sessions/new')
    }

    const tracksNewMatch = url.pathname.match(
      /^\/sfu\/sessions\/([^/]+)\/tracks\/new$/
    )
    if (tracksNewMatch && request.method === 'POST') {
      return sfuProxy(request, env, `sessions/${tracksNewMatch[1]}/tracks/new`)
    }

    const renegotiateMatch = url.pathname.match(
      /^\/sfu\/sessions\/([^/]+)\/renegotiate$/
    )
    if (renegotiateMatch && request.method === 'PUT') {
      return sfuProxy(
        request,
        env,
        `sessions/${renegotiateMatch[1]}/renegotiate`
      )
    }

    const closeMatch = url.pathname.match(
      /^\/sfu\/sessions\/([^/]+)\/tracks\/close$/
    )
    if (closeMatch && request.method === 'PUT') {
      return sfuProxy(request, env, `sessions/${closeMatch[1]}/tracks/close`)
    }

    const sessionInfoMatch = url.pathname.match(/^\/sfu\/sessions\/([^/]+)$/)
    if (sessionInfoMatch && request.method === 'GET') {
      return sfuProxy(request, env, `sessions/${sessionInfoMatch[1]}`)
    }

    // Signaling WebSocket
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
