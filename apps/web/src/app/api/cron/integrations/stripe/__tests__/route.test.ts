import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/stripe/sync', () => ({ syncStripe: vi.fn() }))

import { syncStripe } from '@/lib/integrations/stripe/sync'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/integrations/stripe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('returns success result from syncStripe', async () => {
    vi.mocked(syncStripe).mockResolvedValue({
      rowsUpserted: 5,
      succeeded: ['customers'],
      failed: [],
    } as any)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.rows_upserted).toBe(5)
  })

  it('returns 503 when all entities fail', async () => {
    vi.mocked(syncStripe).mockResolvedValue({
      rowsUpserted: 0,
      succeeded: [],
      failed: ['customers', 'subscriptions'],
    } as any)

    const res = await GET(req())
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })
})
