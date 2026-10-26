import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

const calls: { table: string; method: string; args: unknown[] }[] = []
let events: unknown = []
function client() {
  return {
    from: (table: string) => {
      const b: Record<string, unknown> = {}
      for (const m of ['select', 'insert', 'gte', 'order', 'limit']) {
        b[m] = (...args: unknown[]) => {
          calls.push({ table, method: m, args })
          return b
        }
      }
      b.then = (res: (r: unknown) => unknown) =>
        Promise.resolve(table === 'design_events' ? { data: events, error: null } : { data: null, error: null }).then(res)
      return b
    },
  }
}

const get = (auth = 'Bearer s3cret') => GET(new Request('https://app.test/api/cron/design-lessons', { headers: { authorization: auth } }))

describe('GET /api/cron/design-lessons', () => {
  beforeEach(() => {
    calls.length = 0
    events = []
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    vi.mocked(createServiceClient).mockImplementation(() => client() as never)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('401 with a wrong secret', async () => {
    expect((await get('Bearer nope')).status).toBe(401)
  })

  it('is a dormant no-op when unarmed: no reads, no writes', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ armed: false, persisted: false })
    expect(calls).toHaveLength(0)
  })

  it('when armed, summarises the last 180 days and saves a snapshot', async () => {
    vi.stubEnv('DESIGN_LESSONS_LIVE', '1')
    events = [
      { system: 'card', template: 'forge', action: 'approved', edits: [], reason: null },
      { system: 'card', template: 'forge', action: 'approved', edits: null, reason: null },
      { system: 'card', template: 'ink', action: 'rejected', edits: [], reason: 'too busy' },
      { system: 'card', template: 'BAD ROW', action: 'approved' },
    ]
    const res = await get()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ armed: true, persisted: true, events: 3, skipped: 1 })
    expect(body.top[0]).toBe('forge')
    const insert = calls.find((c) => c.table === 'design_lessons' && c.method === 'insert')
    expect(insert?.args[0]).toMatchObject({ founder_id: 'founder-1', event_count: 3 })
  })
})
