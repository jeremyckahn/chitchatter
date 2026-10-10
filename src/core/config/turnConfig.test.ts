import { afterEach, describe, expect, it, vi } from 'vitest'

import { silentLogger } from 'core/adapters/noop'
import {
  fetchTurnServer,
  isRetriableTurnServerError,
  isRTCIceServer,
} from 'core/config/turnConfig'

const apiUrl = '/api/get-config'
const logger = silentLogger

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'Mocked',
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isRTCIceServer', () => {
  it.each([
    [{ urls: 'turn:example.com' }, true],
    [{ urls: ['turn:a', 'turn:b'] }, true],
    [{ urls: 'turn:a', username: 'u', credential: 'c' }, true],
    [{ urls: 123 }, false],
    [{ username: 'u' }, false],
    [{ urls: 'turn:a', username: 1 }, false],
    [{ urls: 'turn:a', credential: {} }, false],
    [null, false],
    ['turn:a', false],
  ])('validates %j as %s', (candidate, expected) => {
    expect(isRTCIceServer(candidate)).toBe(expected)
  })
})

describe('fetchTurnServer', () => {
  it('returns a valid ICE server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          urls: 'turn:example.com',
          username: 'u',
          credential: 'c',
        })
      )
    )

    await expect(fetchTurnServer(apiUrl, { logger })).resolves.toEqual({
      urls: 'turn:example.com',
      username: 'u',
      credential: 'c',
    })
  })

  it('labels a 4xx as a client error, so callers know not to retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, 403))
    )

    await expect(fetchTurnServer(apiUrl, { logger })).rejects.toThrow(
      /Client error:/
    )
  })

  it('labels a 5xx as a server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, 503))
    )

    await expect(fetchTurnServer(apiUrl, { logger })).rejects.toThrow(
      /Server error:/
    )
  })

  it('rejects a non-JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: { get: () => 'text/html' },
            text: async () => '<html>nope</html>',
          }) as unknown as Response
      )
    )

    await expect(fetchTurnServer(apiUrl, { logger })).rejects.toThrow(
      /Invalid response format/
    )
  })

  it('rejects a malformed ICE server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ not: 'an ice server' }))
    )

    await expect(fetchTurnServer(apiUrl, { logger })).rejects.toThrow(
      /malformed RTCIceServer/
    )
  })

  it('reports a timeout distinctly from other failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, { signal }: { signal: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              const error = new Error('aborted')

              error.name = 'AbortError'
              reject(error)
            })
          })
      )
    )

    await expect(
      fetchTurnServer(apiUrl, { logger, timeoutMs: 5 })
    ).rejects.toThrow(/Request timeout:/)
  })
})

describe('isRetriableTurnServerError', () => {
  it('does not retry client errors or timeouts', () => {
    expect(
      isRetriableTurnServerError(new Error('Client error: 403 Forbidden'))
    ).toBe(false)
    expect(
      isRetriableTurnServerError(new Error('Request timeout: no response'))
    ).toBe(false)
  })

  it('retries anything else', () => {
    expect(isRetriableTurnServerError(new Error('Server error: 500'))).toBe(
      true
    )
    expect(isRetriableTurnServerError(new Error('Network error'))).toBe(true)
    expect(isRetriableTurnServerError(undefined)).toBe(true)
  })
})
