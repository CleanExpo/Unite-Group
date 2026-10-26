import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

const inserts: unknown[] = []
let insertError: unknown = null
const client = {
  from: () => ({
    insert: (row: unknown) => {
      inserts.push(row)
      return Promise.resolve({ error: insertError })
    },
  }),
}

const post = (body: unknown) =>
  POST(new Request('https://app.test/api/founder/design-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))

describe('POST /api/founder/design-events', () => {
  beforeEach(() => {
    inserts.length = 0
    insertError = null
    vi.stubEnv('FOUNDER_ALLOWED_USER_IDS', 'founder-1')
    vi.mocked(createServiceClient).mockReturnValue(client as never)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('401 without a session', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    expect((await post({ system: 'card', template: 'forge', action: 'approved' })).status).toBe(401)
    expect(inserts).toHaveLength(0)
  })

  it('403 for a signed-in non-founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'someone-else', email: 'x@example.com' } as never)
    expect((await post({ system: 'card', template: 'forge', action: 'approved' })).status).toBe(403)
    expect(inserts).toHaveLength(0)
  })

  it('400 for an invalid event', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    expect((await post({ system: 'card', template: 'forge', action: 'loved' })).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('201 and stores the event under the session founder id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    const res = await post({ system: 'card', template: 'forge', action: 'rejected', reason: 'too dark', founder_id: 'attacker' })
    expect(res.status).toBe(201)
    expect(inserts[0]).toMatchObject({ founder_id: 'founder-1', template: 'forge', reason: 'too dark' })
  })

  it('503 when the table is not migrated yet', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    insertError = { code: '42P01', message: 'relation does not exist' }
    expect((await post({ system: 'card', template: 'forge', action: 'chosen' })).status).toBe(503)
  })
})
