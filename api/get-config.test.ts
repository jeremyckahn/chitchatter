import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

import handler from './get-config'

// Mock VercelRequest and VercelResponse
const createMockRequest = (
  method: string = 'GET',
  headers: Record<string, string> = {}
) => ({
  method,
  url: '/api/get-config',
  headers,
  body: undefined,
})

const createMockResponse = () => {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  }
  return response
}

describe('/api/get-config', () => {
  const originalEnv = process.env

  // Test RTC configuration with different TURN server values than fallback
  const testRtcConfig = {
    iceServers: [
      {
        urls: 'turn:test.example.com:3478',
        username: 'testuser123',
        credential: 'testpass456',
      },
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  }

  // Expected TURN server response (extracted from testRtcConfig)
  const expectedTurnServer = {
    urls: 'turn:test.example.com:3478',
    username: 'testuser123',
    credential: 'testpass456',
  }

  // Fallback TURN server (matches the fallback in the handler)
  const fallbackTurnServer = {
    urls: 'turn:relay1.expressturn.com:3478',
    username: 'efQUQ79N77B5BNVVKF',
    credential: 'N4EAUgpjMzPLrxSS',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('returns TURN server from environment variable on GET request', async () => {
    // Set valid base64 encoded RTC config with different TURN server values than fallback
    // This ensures the test is not a false positive by verifying different values are returned
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(testRtcConfig)
    ).toString('base64')

    const req = createMockRequest('GET')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expectedTurnServer)
  })

  test('returns fallback TURN server when environment variable is missing', async () => {
    delete process.env.RTC_CONFIG

    const req = createMockRequest('GET')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(fallbackTurnServer)
  })

  test('returns fallback TURN server when environment variable has invalid base64', async () => {
    process.env.RTC_CONFIG = 'invalid-base64!'

    const req = createMockRequest('GET')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(fallbackTurnServer)
  })

  test('returns fallback TURN server when environment variable has invalid JSON', async () => {
    // Base64 encode invalid JSON
    process.env.RTC_CONFIG = Buffer.from('{ invalid json }').toString('base64')

    const req = createMockRequest('GET')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(fallbackTurnServer)
  })

  test('returns fallback TURN server when environment variable has invalid RTCConfiguration format', async () => {
    // Base64 encode invalid RTCConfiguration (missing iceServers)
    const invalidConfig = { notIceServers: [] }
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(invalidConfig)
    ).toString('base64')

    const req = createMockRequest('GET')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(fallbackTurnServer)
  })

  test('returns fallback TURN server when configuration has no TURN server', async () => {
    // Base64 encode RTC config with only STUN servers (no TURN servers)
    const stunOnlyConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(stunOnlyConfig)
    ).toString('base64')

    const req = createMockRequest('GET')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(fallbackTurnServer)
  })

  test('sets CORS headers with allowed origin', async () => {
    // Set valid environment variable to avoid console errors
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(testRtcConfig)
    ).toString('base64')

    const req = createMockRequest('GET', { origin: 'https://chitchatter.im' })
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://chitchatter.im'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type'
    )
  })

  test('sets CORS headers with localhost origin for development', async () => {
    // Set valid environment variable to avoid console errors
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(testRtcConfig)
    ).toString('base64')

    const req = createMockRequest('GET', { origin: 'http://localhost:3000' })
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'http://localhost:3000'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type'
    )
  })

  test('sets CORS headers with fallback domain for disallowed origin', async () => {
    // Set valid environment variable to avoid console errors
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(testRtcConfig)
    ).toString('base64')

    const req = createMockRequest('GET', { origin: 'https://malicious.com' })
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://chitchatter.im'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type'
    )
  })

  test('sets CORS headers with fallback domain when no origin header', async () => {
    // Set valid environment variable to avoid console errors
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(testRtcConfig)
    ).toString('base64')

    const req = createMockRequest('GET')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://chitchatter.im'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type'
    )
  })

  test('returns 405 for non-GET requests', async () => {
    const req = createMockRequest('POST')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  test('returns 405 for PUT requests', async () => {
    const req = createMockRequest('PUT')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  test('returns 405 for DELETE requests', async () => {
    const req = createMockRequest('DELETE')
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' })
  })

  test('uses wildcard CORS when debug override is enabled', async () => {
    // Set debug override environment variable
    process.env.CORS_ALLOW_ALL = 'true'

    // Set valid environment variable to avoid console errors
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(testRtcConfig)
    ).toString('base64')

    const req = createMockRequest('GET', { origin: 'https://malicious.com' })
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      '*'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type'
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expectedTurnServer)
  })

  test('uses restricted CORS when debug override is explicitly disabled', async () => {
    // Explicitly disable debug override
    process.env.CORS_ALLOW_ALL = 'false'

    // Set valid environment variable to avoid console errors
    process.env.RTC_CONFIG = Buffer.from(
      JSON.stringify(testRtcConfig)
    ).toString('base64')

    const req = createMockRequest('GET', { origin: 'https://malicious.com' })
    const res = createMockResponse()

    await handler(req as any, res as any)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://chitchatter.im'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET'
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type'
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expectedTurnServer)
  })
})
