import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../server/auth-middleware', () => ({
  isAuthenticated: () => true,
}))

const originalEnv = { ...process.env }
const originalFetch = globalThis.fetch

beforeEach(() => {
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = { ...originalEnv }
  globalThis.fetch = originalFetch
  vi.resetModules()
})

describe('/api/video-command-center safety reporting', () => {
  it('redacts URL credentials from disconnected responses', async () => {
    const userInfo = `operator:${'opaque-value'}`
    const rawBaseUrl = `http://${userInfo}@127.0.0.1:3990`
    process.env.VIDEO_COMMAND_CENTER_URL = rawBaseUrl
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error(`connect ${rawBaseUrl}/api/projects failed`)),
    )

    const { Route } = await import('./video-command-center')
    const handlers = Route.options.server?.handlers as {
      GET: (ctx: { request: Request }) => Promise<Response>
    }

    const response = await handlers.GET({
      request: new Request('http://localhost/api/video-command-center'),
    })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.baseUrl).toBe('http://[REDACTED]@127.0.0.1:3990')
    expect(payload.error).toContain(
      'http://[REDACTED]@127.0.0.1:3990/api/projects',
    )
    expect(JSON.stringify(payload)).not.toContain(userInfo)
  })
})
