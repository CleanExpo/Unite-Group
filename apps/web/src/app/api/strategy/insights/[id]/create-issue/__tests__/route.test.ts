import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({
  sanitiseError: vi.fn((_e: unknown, fallback: string) => fallback),
}))
vi.mock('@/lib/integrations/linear', () => ({
  createIssue: vi.fn(),
  BUSINESS_TO_TEAM: { acme: 'ACM' } as Record<string, string>,
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { createIssue } from '@/lib/integrations/linear'
import { GET, POST } from '../route'

type Res = { data?: unknown; error: unknown }

/** Chain recording from/insert/update/eq; terminals consume an ordered queue. */
function makeDb(results: Res[]) {
  const queue = [...results]
  const next = () => (queue.length ? queue.shift()! : { data: null, error: null })
  const calls = {
    insert: [] as unknown[],
    updates: [] as { values: unknown; eq: unknown[][] }[],
  }
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.insert = vi.fn((v: unknown) => { calls.insert.push(v); return chain })
  chain.maybeSingle = vi.fn(() => Promise.resolve(next()))
  chain.single = vi.fn(() => Promise.resolve(next()))
  chain.update = vi.fn((values: unknown) => {
    const rec = { values, eq: [] as unknown[][] }
    calls.updates.push(rec)
    const sub: Record<string, unknown> = {}
    sub.eq = vi.fn((...a: unknown[]) => { rec.eq.push(a); return sub })
    sub.then = (r: (v: unknown) => unknown) => r(next())
    return sub
  })
  return { chain, calls }
}

const insight = {
  id: 'ins-1', business_key: 'acme', title: 'T', body: 'B', type: 'risk',
  priority: 'high', status: 'new',
}
const post = (body: unknown) =>
  new Request('http://localhost/x', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
const ctx = { params: Promise.resolve({ id: 'ins-1' }) }

describe('POST /api/strategy/insights/[id]/create-issue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests without touching DB or Linear', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(post({ acceptanceCriteria: 'ok' }), ctx)
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
    expect(createIssue).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const res = await POST(post('{bad'), ctx)
    expect(res.status).toBe(400)
    expect(createIssue).not.toHaveBeenCalled()
  })

  it('rejects missing acceptance criteria', async () => {
    const res = await POST(post({ acceptanceCriteria: '  ' }), ctx)
    expect(res.status).toBe(400)
    expect(createClient).not.toHaveBeenCalled()
    expect(createIssue).not.toHaveBeenCalled()
  })

  it('rejects autonomous execution with 409', async () => {
    const res = await POST(post({ acceptanceCriteria: 'ok', autonomous: true }), ctx)
    expect(res.status).toBe(409)
    expect(createIssue).not.toHaveBeenCalled()
  })

  it("returns 404 when the insight is not the founder's", async () => {
    const { chain } = makeDb([
      { data: null, error: null },
      { data: null, error: { message: 'none' } },
    ])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    const res = await POST(post({ acceptanceCriteria: 'ok' }), ctx)
    expect(res.status).toBe(404)
    expect(createIssue).not.toHaveBeenCalled()
  })

  it('is idempotent: existing link returns 200 without creating an issue', async () => {
    const { chain } = makeDb([{ data: { id: 'link-1' }, error: null }])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    const res = await POST(post({ acceptanceCriteria: 'ok' }), ctx)
    expect(res.status).toBe(200)
    expect(createIssue).not.toHaveBeenCalled()
  })

  it('returns 400 when the business has no Linear team', async () => {
    const { chain } = makeDb([
      { data: null, error: null },
      { data: { ...insight, business_key: 'unmapped' }, error: null },
    ])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    const res = await POST(post({ acceptanceCriteria: 'ok' }), ctx)
    expect(res.status).toBe(400)
    expect(createIssue).not.toHaveBeenCalled()
  })

  it('returns 502 when Linear fails and records no link', async () => {
    const { chain, calls } = makeDb([
      { data: null, error: null },
      { data: insight, error: null },
    ])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    vi.mocked(createIssue).mockRejectedValue(new Error('linear down'))
    const res = await POST(post({ acceptanceCriteria: 'ok' }), ctx)
    expect(res.status).toBe(502)
    expect(calls.insert).toHaveLength(0)
  })

  it('returns 500 when the link insert fails', async () => {
    const { chain } = makeDb([
      { data: null, error: null },
      { data: insight, error: null },
      { data: null, error: { message: 'db' } },
    ])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    vi.mocked(createIssue).mockResolvedValue({ id: 'L-1' })
    const res = await POST(post({ acceptanceCriteria: 'ok' }), ctx)
    expect(res.status).toBe(500)
  })

  it('creates the issue, links it founder-scoped and advances the insight', async () => {
    const { chain, calls } = makeDb([
      { data: null, error: null },
      { data: insight, error: null },
      { data: { id: 'link-1' }, error: null },
    ])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    vi.mocked(createIssue).mockResolvedValue({ id: 'L-1', url: 'https://linear.test/L-1' })

    const res = await POST(
      post({ acceptanceCriteria: ' done when X ', evidenceIds: [' e1 ', ''] }),
      ctx,
    )

    expect(res.status).toBe(201)
    expect(createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ teamKey: 'ACM', priority: 2, title: 'T' }),
    )
    expect(calls.insert[0]).toEqual(
      expect.objectContaining({
        founder_id: 'user-123', insight_id: 'ins-1', linear_issue_id: 'L-1',
        acceptance_criteria: 'done when X', evidence_ids: ['e1'], autonomous: false,
      }),
    )
    expect(calls.updates).toHaveLength(1)
    expect(calls.updates[0].values).toEqual(expect.objectContaining({ status: 'acting' }))
    expect(calls.updates[0].eq).toContainEqual(['founder_id', 'user-123'])
  })
})

describe('GET /api/strategy/insights/[id]/create-issue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests without querying', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(new Request('http://localhost/x'), ctx)
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns the founder-scoped link', async () => {
    const { chain } = makeDb([{ data: { id: 'link-1' }, error: null }])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    const res = await GET(new Request('http://localhost/x'), ctx)
    expect(res.status).toBe(200)
    expect(chain.eq).toHaveBeenCalledWith('founder_id', 'user-123')
    expect(await res.json()).toEqual({ link: { id: 'link-1' } })
  })

  it('returns 500 on DB error', async () => {
    const { chain } = makeDb([{ data: null, error: { message: 'db' } }])
    vi.mocked(createClient).mockResolvedValue(chain as never)
    const res = await GET(new Request('http://localhost/x'), ctx)
    expect(res.status).toBe(500)
  })
})
