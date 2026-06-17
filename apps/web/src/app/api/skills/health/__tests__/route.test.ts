import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { GET, POST } from '../route'
import { getUser, createClient } from '@/lib/supabase/server'

let eqCalls: Array<[string, unknown]> = []
let insertArg: unknown = null

// Builder: GET awaits after .order(); POST terminates in .insert().select().single().
function makeSupabase(result: Record<string, unknown>) {
  const builder: Record<string, unknown> = {}
  const passthrough = () => builder
  builder.select = passthrough
  builder.order = passthrough
  builder.eq = (col: string, val: unknown) => {
    eqCalls.push([col, val])
    return builder
  }
  builder.insert = (arg: unknown) => {
    insertArg = arg
    return builder
  }
  builder.single = () => Promise.resolve(result)
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return { from: () => builder }
}

function postReq(body: unknown) {
  return new Request('https://app.test/api/skills/health', {
    method: 'POST', body: JSON.stringify(body),
  }) as never
}

beforeEach(() => {
  eqCalls = []
  insertArg = null
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
})

describe('GET /api/skills/health', () => {
  it('returns 401 when unauthenticated and never queries the database', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('founder-scopes and keeps only the latest row per skill_name', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({
      data: [
        { skill_name: 'a', run_at: '2026-06-02', pass_rate: 0.9 },
        { skill_name: 'a', run_at: '2026-06-01', pass_rate: 0.5 },
        { skill_name: 'b', run_at: '2026-06-02', pass_rate: 1 },
      ],
      error: null,
    }) as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveLength(2)
    expect(json.find((r: { skill_name: string }) => r.skill_name === 'a').pass_rate).toBe(0.9)
    expect(eqCalls).toContainEqual(['founder_id', 'founder-1'])
  })

  it('returns 500 when the query errors', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: null, error: { message: 'boom' } }) as never)
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/skills/health', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(postReq({ skill_name: 'a', eval_count: 1, pass_count: 1, pass_rate: 1 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing and never inserts', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: null, error: null }) as never)
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
    expect(insertArg).toBeNull()
  })

  it('returns 201 with the inserted row scoped to the founder', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: { id: 's1' }, error: null }) as never)
    const res = await POST(postReq({ skill_name: 'a', eval_count: 5, pass_count: 4, pass_rate: 0.8 }))
    expect(res.status).toBe(201)
    expect(insertArg).toMatchObject({ founder_id: 'founder-1', skill_name: 'a' })
  })
})
