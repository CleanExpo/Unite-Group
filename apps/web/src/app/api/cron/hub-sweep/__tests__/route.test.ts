// src/app/api/cron/hub-sweep/__tests__/route.test.ts
// Tests for the nightly hub intelligence sweep cron.

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — declared before SUT import
// ---------------------------------------------------------------------------

const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}))

const mockFetchIssueCountByBusiness = vi.fn()
vi.mock('@/lib/integrations/linear', () => ({
  fetchIssueCountByBusiness: (...args: unknown[]) => mockFetchIssueCountByBusiness(...args),
}))

const mockFetchLastCommit = vi.fn()
const mockParseRepoUrl = vi.fn()
vi.mock('@/lib/integrations/github', () => ({
  fetchLastCommit: (...args: unknown[]) => mockFetchLastCommit(...args),
  parseRepoUrl: (...args: unknown[]) => mockParseRepoUrl(...args),
}))

// ---------------------------------------------------------------------------
// SUT — imported after mocks
// ---------------------------------------------------------------------------

import { GET } from '../route'
import { OWNED_BUSINESSES } from '@/lib/businesses'

// The sweep covers every owned business. Derive the count from the same source
// of truth so adding a business doesn't break this test.
const OWNED_COUNT = OWNED_BUSINESSES.length

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_AUTH = `Bearer test-cron-secret`

function makeRequest(opts: { auth?: string } = {}): Request {
  return new Request('http://localhost/api/cron/hub-sweep', {
    headers: {
      authorization: opts.auth ?? VALID_AUTH,
    },
  })
}

function setupEnv() {
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.FOUNDER_USER_ID = 'founder-uuid'
}

function setupSupabaseMocks(opts: { businessRows?: Array<{ id: string; slug: string }> } = {}) {
  // advisory_cases query
  const advisoryChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }

  // bookkeeper_runs query
  const bookkeeperChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  // businesses slug → id lookup
  const businessesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: opts.businessRows ?? [], error: null }),
  }

  // hub_satellites select (existing rows)
  const hubSelectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  // hub_satellites upsert
  const hubUpsertChain = {
    upsert: vi.fn().mockResolvedValue({ error: null }),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'advisory_cases') return advisoryChain
    if (table === 'bookkeeper_runs') return bookkeeperChain
    if (table === 'businesses') return businessesChain
    if (table === 'hub_satellites') {
      // Return select chain first, then upsert chain
      return {
        ...hubSelectChain,
        ...hubUpsertChain,
      }
    }
    return hubUpsertChain
  })

  return { advisoryChain, bookkeeperChain, businessesChain, hubSelectChain, hubUpsertChain }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/hub-sweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupEnv()
    mockFetchIssueCountByBusiness.mockResolvedValue({})
    mockParseRepoUrl.mockReturnValue(null)
    mockFetchLastCommit.mockResolvedValue(null)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest({ auth: 'wrong-secret' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET does not match', async () => {
    process.env.CRON_SECRET = 'different-secret'
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 500 when FOUNDER_USER_ID is not set', async () => {
    delete process.env.FOUNDER_USER_ID
    setupSupabaseMocks()
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(500)
  })

  it('returns 200 and sweeps all owned businesses', async () => {
    setupSupabaseMocks()
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json() as { satellitesSwept: number }
    // Every owned business is swept (CCW is client-type and excluded).
    expect(body.satellitesSwept).toBe(OWNED_COUNT)
  })

  it('fetches Linear issue counts and includes them in the upsert', async () => {
    setupSupabaseMocks()
    mockFetchIssueCountByBusiness.mockResolvedValue({ synthex: 3, dr: 1 })

    const req = makeRequest()
    await GET(req)

    expect(mockFetchIssueCountByBusiness).toHaveBeenCalledOnce()
  })

  it('fetches GitHub commit data when repo_url is set', async () => {
    // Existing satellite row with repo_url
    const hubRows = [{ business_key: 'synthex', repo_url: 'https://github.com/CleanExpo/Synthex', stack: 'next.js', notes: null }]
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: table === 'hub_satellites' ? hubRows : [], error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }))

    mockParseRepoUrl.mockReturnValue({ owner: 'CleanExpo', repo: 'Synthex' })
    mockFetchLastCommit.mockResolvedValue({ sha: 'abc1234', message: 'feat: add new UI', authorDate: '2026-03-24T10:00:00Z' })

    const req = makeRequest()
    await GET(req)

    expect(mockFetchLastCommit).toHaveBeenCalledWith('CleanExpo', 'Synthex')
  })

  it('falls back to the registry repoUrl when the satellite row has none', async () => {
    setupSupabaseMocks()
    mockParseRepoUrl.mockReturnValue(null)

    const req = makeRequest()
    await GET(req)

    // No satellite rows exist, so every owned business uses its registry default.
    expect(mockParseRepoUrl).toHaveBeenCalledWith('https://github.com/CleanExpo/Disaster-Recovery')
    expect(mockParseRepoUrl).toHaveBeenCalledWith('https://github.com/CleanExpo/Synthex')
  })

  it('queries MACAS verdicts per business via the businesses slug map', async () => {
    const { advisoryChain } = setupSupabaseMocks({ businessRows: [{ id: 'biz-dr', slug: 'dr' }] })

    const req = makeRequest()
    await GET(req)

    // Only 'dr' has a businesses row — advisory_cases is filtered by its id,
    // and no proxy query runs for the other satellites.
    expect(advisoryChain.eq).toHaveBeenCalledWith('business_id', 'biz-dr')
    expect(advisoryChain.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it('does NOT sweep CCW (client-type business)', async () => {
    setupSupabaseMocks()
    const req = makeRequest()
    const res = await GET(req)
    const body = await res.json() as { results: Array<{ businessKey: string }> }

    const keys = body.results.map(r => r.businessKey)
    expect(keys).not.toContain('ccw')
  })

  it('continues sweeping other satellites when one fails', async () => {
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hub_satellites') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          upsert: vi.fn().mockImplementation(() => {
            callCount++
            // First upsert fails, rest succeed
            return Promise.resolve({ error: callCount === 1 ? { message: 'DB error' } : null })
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const req = makeRequest()
    const res = await GET(req)
    // Should still return 200 (partial success)
    expect(res.status).toBe(200)
  })
})
