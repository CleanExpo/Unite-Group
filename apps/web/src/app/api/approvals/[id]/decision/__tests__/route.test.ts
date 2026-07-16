import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { POST } from '../route'

// Chainable mock: every method returns the chain; single() resolves from a
// queue so the read step and the write step get their own results.
function makeClient(results: Array<{ data: unknown; error: unknown }>) {
  const singles = [...results]
  const updates: unknown[] = []
  const chain: Record<string, any> = {}
  for (const m of ['select', 'eq']) {
    chain[m] = vi.fn().mockImplementation(() => chain)
  }
  chain.update = vi.fn().mockImplementation((values: unknown) => {
    updates.push(values)
    return chain
  })
  const next = () => Promise.resolve(singles.shift() ?? { data: null, error: { message: 'exhausted' } })
  chain.single = vi.fn().mockImplementation(next)
  chain.maybeSingle = vi.fn().mockImplementation(next)
  return { client: { from: vi.fn().mockReturnValue(chain) }, chain, updates }
}

function postReq(body: object) {
  return new Request('https://app.test/api/approvals/ap-1/decision', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ id: 'ap-1' }) }

describe('POST /api/approvals/[id]/decision', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ decision: 'approve' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 400 for an unknown decision', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ decision: 'maybe' }), params)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/approve, reject/)
  })

  it('returns 404 when the approval does not exist for this founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const { client } = makeClient([{ data: null, error: { message: 'not found' } }])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(postReq({ decision: 'approve' }), params)
    expect(res.status).toBe(404)
  })

  it('returns 409 when the approval was already decided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const { client } = makeClient([{ data: { id: 'ap-1', status: 'approved' }, error: null }])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(postReq({ decision: 'reject' }), params)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already approved/)
  })

  it('approve → pending row becomes approved with approved_at stamped', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const { client, updates } = makeClient([
      { data: { id: 'ap-1', status: 'pending' }, error: null },
      { data: { id: 'ap-1', status: 'approved', approved_at: 'now', updated_at: 'now' }, error: null },
    ])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(postReq({ decision: 'approve' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.approval.status).toBe('approved')
    expect(updates[0]).toMatchObject({ status: 'approved' })
    expect((updates[0] as { approved_at: string | null }).approved_at).toBeTruthy()
  })

  it('reject → pending row becomes rejected with approved_at null', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const { client, updates } = makeClient([
      { data: { id: 'ap-1', status: 'pending' }, error: null },
      { data: { id: 'ap-1', status: 'rejected', approved_at: null, updated_at: 'now' }, error: null },
    ])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(postReq({ decision: 'reject' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.approval.status).toBe('rejected')
    expect(updates[0]).toMatchObject({ status: 'rejected', approved_at: null })
  })

  it('returns 500 when the confirmed write fails — never a green 200 over a stale row', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const { client } = makeClient([
      { data: { id: 'ap-1', status: 'pending' }, error: null },
      { data: null, error: { message: 'write failed' } },
    ])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(postReq({ decision: 'approve' }), params)
    expect(res.status).toBe(500)
  })

  it('returns 409 when a concurrent decision wins the race (0 rows updated, no error)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const { client } = makeClient([
      { data: { id: 'ap-1', status: 'pending' }, error: null },
      // maybeSingle on a 0-row UPDATE: data null, error null.
      { data: null, error: null },
    ])
    vi.mocked(createClient).mockResolvedValue(client as any)

    const res = await POST(postReq({ decision: 'approve' }), params)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/concurrently/)
  })
})
