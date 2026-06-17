import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { GET, POST } from '../route'
import { getUser, createClient } from '@/lib/supabase/server'

let eqCalls: Array<[string, unknown]> = []
let upsertArg: unknown = null

function makeSupabase(result: Record<string, unknown>) {
  const builder: Record<string, unknown> = {}
  const passthrough = () => builder
  builder.select = passthrough
  builder.eq = (col: string, val: unknown) => {
    eqCalls.push([col, val])
    return builder
  }
  builder.upsert = (arg: unknown) => {
    upsertArg = arg
    return builder
  }
  builder.single = () => Promise.resolve(result)
  return { from: () => builder }
}

function postReq(body: unknown) {
  return new Request('https://app.test/api/settings/update', {
    method: 'POST', body: JSON.stringify(body),
  }) as never
}
const getReq = () => new Request('https://app.test/api/settings/update') as never

beforeEach(() => {
  eqCalls = []
  upsertArg = null
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
})

describe('POST /api/settings/update', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(postReq({ timezone: 'UTC' }))
    expect(res.status).toBe(401)
  })

  it('rejects an invalid timezone with 400', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: {}, error: null }) as never)
    const res = await POST(postReq({ timezone: 'Mars/Phobos' }))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid locale with 400', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: {}, error: null }) as never)
    const res = await POST(postReq({ locale: 'xx-YY' }))
    expect(res.status).toBe(400)
  })

  it('scopes the upsert to the authenticated user_id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: { user_id: 'founder-1' }, error: null }) as never)
    const res = await POST(postReq({ timezone: 'UTC', locale: 'en-AU' }))
    expect(res.status).toBe(200)
    expect(upsertArg).toMatchObject({ user_id: 'founder-1' })
  })

  it('returns 500 when the upsert errors', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: null, error: { message: 'boom' } }) as never)
    const res = await POST(postReq({ timezone: 'UTC' }))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/settings/update', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('returns en-AU defaults (200, not 500) when no settings row exists yet', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: null, error: { message: 'no rows' } }) as never)
    const res = await GET(getReq())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.timezone).toBe('Australia/Sydney')
    expect(json.locale).toBe('en-AU')
  })

  it('returns the stored settings scoped to user_id when present', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: { user_id: 'founder-1', timezone: 'UTC' }, error: null }) as never)
    const res = await GET(getReq())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.timezone).toBe('UTC')
    expect(eqCalls).toContainEqual(['user_id', 'founder-1'])
  })
})
