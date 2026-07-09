import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Supabase mock -----------------------------------------------------
// Per-table FIFO response queues so margot's two `margot_voice_sessions`
// reads (count then latest) and the vault/upsert calls each resolve
// independently, mirroring the analytics-sync route test's chain style.

let responses: Record<string, any[]>

function makeChain(table: string) {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    upsert: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      const queue = responses[table] ?? []
      const next = queue.shift() ?? { data: [], error: null }
      return Promise.resolve(next).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.gte.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.limit.mockReturnValue(b)
  b.upsert.mockImplementation(() => Promise.resolve({ data: null, error: null }))
  return b
}

const mockFrom = vi.fn((table: string) => makeChain(table))

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/portfolio-health', () => ({
  PORTFOLIO_REPOS: [{ repo: 'RestoreAssist', fullName: 'CleanExpo/RestoreAssist' }],
  buildPortfolioHealth: vi.fn(),
}))
vi.mock('@/lib/command-centre/portfolio-health-fetchers', () => ({
  makeGithubRunsFetcher: vi.fn(() => vi.fn()),
  makeLinearP0P1Fetcher: vi.fn(() => vi.fn()),
}))
vi.mock('@/lib/command-centre/margot-health', () => ({
  deriveMargotHealth: vi.fn(),
}))
vi.mock('@/lib/command-centre/email-accounts', () => ({
  deriveEmailAccounts: vi.fn(),
  EMAIL_PROVIDERS: [{ id: 'sendgrid', label: 'SendGrid', source: 'env', envKeys: ['SENDGRID_API_KEY'] }],
}))

import { createServiceClient } from '@/lib/supabase/service'
import { buildPortfolioHealth } from '@/lib/command-centre/portfolio-health'
import { deriveMargotHealth } from '@/lib/command-centre/margot-health'
import { deriveEmailAccounts } from '@/lib/command-centre/email-accounts'
import { GET } from '../route'

vi.stubGlobal('fetch', vi.fn())

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

const GREEN_PORTFOLIO = {
  configured: true,
  source: 'github_live',
  repos: [{ repo: 'RestoreAssist', fullName: 'CleanExpo/RestoreAssist', color: 'green', latestConclusion: 'success', failCountLast10: 0, latestRunAt: null, latestRunUrl: null }],
  overall: 'green',
  openP0P1: 0,
  linearSource: 'linear_live',
  timestamp: '2026-07-09T00:00:00.000Z',
}

const GREEN_MARGOT = {
  source: 'cc:margot-health',
  generatedAt: '2026-07-09T00:00:00.000Z',
  windowDays: 14,
  voiceReady: true,
  config: { elevenLabsApiKey: true, margotAgentId: true, ingestToken: true, founderConfigured: true },
  voice: { source: 'live', latestSessionAt: '2026-07-08T23:00:00.000Z', sessionsInWindow: 3, error: null },
  agents: { source: 'live', latestSeenAt: '2026-07-08T23:00:00.000Z', activeCount: 1, error: null },
}

const CONNECTED_EMAIL = {
  source: 'cc:email-accounts',
  generatedAt: '2026-07-09T00:00:00.000Z',
  summary: { connected: 1, needsReauth: 0, notConnected: 3, total: 4 },
  providers: [],
}

describe('GET /api/cron/os-health-rollup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('GITHUB_TOKEN', 'gh-token')
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    vi.stubEnv('PI_CEO_API_URL', 'https://pi-ceo.test')
    vi.stubEnv('PI_CEO_API_KEY', 'pi-ceo-key')
    responses = {}
    mockFrom.mockClear()
    mockFrom.mockImplementation((table: string) => makeChain(table))
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
    vi.mocked(buildPortfolioHealth).mockResolvedValue(GREEN_PORTFOLIO as any)
    vi.mocked(deriveMargotHealth).mockReturnValue(GREEN_MARGOT as any)
    vi.mocked(deriveEmailAccounts).mockReturnValue(CONNECTED_EMAIL as any)
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ machines: [{ is_stale: false }], ships: [] }),
    } as any)
  })

  it('returns 401 without a valid CRON_SECRET', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('happy path upserts all 4 rows with normalisable statuses', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.upserted.sort()).toEqual(['email-accounts', 'margot', 'mesh-fleet', 'portfolio-health'])
    expect(body.errors).toEqual([])

    const upsertCalls = mockFrom.mock.results
      .filter((_, i) => mockFrom.mock.calls[i][0] === 'dashboard_health')
      .map((r) => r.value.upsert.mock.calls[0]?.[0])
      .filter(Boolean)

    expect(upsertCalls).toHaveLength(4)
    for (const row of upsertCalls) {
      expect(['GREEN', 'AMBER', 'RED']).toContain(row.status)
      expect(row.reported_at).toEqual(expect.any(String))
    }
  })

  it('mesh-fleet PI_CEO_API_URL missing → not_configured AMBER while others still upsert', async () => {
    vi.stubEnv('PI_CEO_API_URL', '')
    const res = await GET(req())
    const body = await res.json()
    expect(body.upserted).toContain('mesh-fleet')

    const meshUpsert = mockFrom.mock.results
      .filter((_, i) => mockFrom.mock.calls[i][0] === 'dashboard_health')
      .map((r) => r.value.upsert.mock.calls[0]?.[0])
      .find((row) => row?.id === 'mesh-fleet')

    expect(meshUpsert.status).toBe('AMBER')
    expect(meshUpsert.detail.reason).toBe('not_configured')
  })

  it('a source whose fetch throws upserts AMBER-with-error while the others still upsert cleanly', async () => {
    vi.mocked(buildPortfolioHealth).mockRejectedValue(new Error('github fetch exploded'))
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.upserted.sort()).toEqual(['email-accounts', 'margot', 'mesh-fleet', 'portfolio-health'])
    expect(body.errors).toEqual([])

    const rows = mockFrom.mock.results
      .filter((_, i) => mockFrom.mock.calls[i][0] === 'dashboard_health')
      .map((r) => r.value.upsert.mock.calls[0]?.[0])

    const portfolioRow = rows.find((row) => row?.id === 'portfolio-health')
    expect(portfolioRow.status).toBe('AMBER')
    expect(portfolioRow.detail.error).toMatch(/github fetch exploded/)

    const margotRow = rows.find((row) => row?.id === 'margot')
    expect(margotRow.status).toBe('GREEN')
  })

  it('response shape is { upserted, errors }', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(Array.isArray(body.upserted)).toBe(true)
    expect(Array.isArray(body.errors)).toBe(true)
  })
})
