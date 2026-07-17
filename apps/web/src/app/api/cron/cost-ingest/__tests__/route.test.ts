import { describe, it, expect, vi } from 'vitest'

// Mock the metering pipeline so importing the route is side-effect-free — the
// auth guard runs before any of it, which is exactly what these tests assert.
vi.mock('@/lib/metering/fetchers/registry', () => ({ COST_FETCHERS: [] }))
vi.mock('@/lib/metering/ingest', () => ({ planIngest: vi.fn() }))
vi.mock('@/lib/metering/persist', () => ({ persistPlan: vi.fn() }))
vi.mock('@/lib/metering/fx', () => ({ toAud: vi.fn() }))
vi.mock('@/lib/metering/supabase-store', () => ({
  createSupabaseMeteringStore: vi.fn(),
  loadBusinessSlugToId: vi.fn(),
}))

import { persistPlan } from '@/lib/metering/persist'
import { GET } from '../route'

function req(auth?: string) {
  return new Request('https://app.test', {
    headers: auth ? { authorization: auth } : {},
  })
}

describe('GET /api/cron/cost-ingest auth', () => {
  it('rejects `Bearer undefined` when CRON_SECRET is unset (no bypass, no work)', async () => {
    vi.stubEnv('CRON_SECRET', undefined)
    const res = await GET(req('Bearer undefined'))
    expect(res.status).not.toBe(200)
    expect(res.status).toBe(500)
    expect(persistPlan).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('returns 401 for a wrong bearer', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret')
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
    vi.unstubAllEnvs()
  })
})
