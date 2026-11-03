import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CARD_ENV_NAMES, GET, INTAKE_PAYLOAD_COLUMNS } from '../route'

// hasPrivateAccess is deliberately NOT mocked: founder identity is part of what this suite proves.
const FOUNDER = 'founder-1'
const SENTINEL = 'sentinel-value-not-a-real-credential'

type ProbeError = { code?: string; message?: string } | null

/** answer(table, column) decides what the database API says for each probe. */
function db(answer: (table: string, column: string) => ProbeError | Error) {
  const limits: number[] = []
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: (table: string) => ({
      select: (column: string) => ({
        limit: async (n: number) => {
          limits.push(n)
          const result = answer(table, column)
          if (result instanceof Error) throw result
          return { data: [{ [column]: SENTINEL }], error: result }
        },
      }),
    }),
  })
  return limits
}

const leaves = (v: unknown): unknown[] => (v !== null && typeof v === 'object' ? Object.values(v).flatMap(leaves) : [v])

describe('GET /api/health/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('FOUNDER_ALLOWED_USER_IDS', FOUNDER)
    vi.stubEnv('FOUNDER_ALLOWED_EMAILS', '')
    for (const name of CARD_ENV_NAMES) vi.stubEnv(name, '')
    ;(getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: FOUNDER, email: 'founder@example.invalid' })
    db(() => null)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('refuses without a login, before touching the database', async () => {
    ;(getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('refuses a logged-in user who is not the founder, before touching the database', async () => {
    ;(getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'someone-else', email: 'x@example.invalid' })
    expect((await GET()).status).toBe(403)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('reports every env name as a boolean and never the value', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', SENTINEL)
    vi.stubEnv('STRIPE_CARD_PAYMENT_LINK_IDS', SENTINEL)
    const res = await GET()
    const raw = await res.clone().text()
    const body = await res.json()
    expect(raw).not.toContain(SENTINEL)
    expect(Object.keys(body.env).sort()).toEqual([...CARD_ENV_NAMES].sort())
    expect(body.env.STRIPE_WEBHOOK_SECRET).toBe(true)
    expect(body.env.STRIPE_CARD_PAYMENT_LINK_IDS).toBe(true)
    expect(body.env.MAILTRAP_API_KEY).toBe(false)
  })

  it('reads a placeholder or blank env value as not set', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', 'your-key-here')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '   ')
    const { env } = await (await GET()).json()
    expect(env.MAILTRAP_API_KEY).toBe(false)
    expect(env.STRIPE_WEBHOOK_SECRET).toBe(false)
  })

  it('every leaf of the answer is a boolean, in every database state', async () => {
    const states: Array<(t: string, c: string) => ProbeError | Error> = [
      () => null,
      () => ({ code: '42703', message: `column does not exist ${SENTINEL}` }),
      () => ({ code: '42501', message: `permission denied ${SENTINEL}` }),
      () => new Error(SENTINEL),
    ]
    for (const state of states) {
      db(state)
      const res = await GET()
      expect(res.status).toBe(200)
      expect(await res.clone().text()).not.toContain(SENTINEL)
      for (const leaf of leaves(await res.json())) expect(typeof leaf).toBe('boolean')
    }
  })

  it('all true when the migrations are applied, and asks for no rows', async () => {
    const limits = db(() => null)
    const body = await (await GET()).json()
    expect(Object.keys(body.card_order_intakes_columns).sort()).toEqual([...INTAKE_PAYLOAD_COLUMNS].sort())
    expect(Object.values(body.card_order_intakes_columns).every((v) => v === true)).toBe(true)
    expect(body.card_order_emails_table).toBe(true)
    expect(body.schema_checked).toBe(true)
    expect(limits).toHaveLength(INTAKE_PAYLOAD_COLUMNS.length + 1)
    expect(limits.every((n) => n === 0)).toBe(true)
  })

  it('answers 200 with false, checked, for what production said on 2 Nov 2026 (42703 and PGRST205)', async () => {
    db((table) => (table === 'card_order_emails' ? { code: 'PGRST205' } : { code: '42703' }))
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.values(body.card_order_intakes_columns).every((v) => v === false)).toBe(true)
    expect(body.card_order_emails_table).toBe(false)
    expect(body.schema_checked).toBe(true)
  })

  it('tells each column apart', async () => {
    db((_t, column) => (column === 'brief' ? { code: '42703' } : null))
    const { card_order_intakes_columns: columns } = await (await GET()).json()
    expect(columns.brief).toBe(false)
    expect(columns.film).toBe(true)
  })

  it('a permission error is unknown, not a missing migration', async () => {
    db(() => ({ code: '42501' }))
    const res = await GET()
    expect(res.status).toBe(200)
    expect((await res.json()).schema_checked).toBe(false)
  })

  it('a thrown probe is unknown and the other answers survive', async () => {
    db((_t, column) => (column === 'film' ? new Error('network') : null))
    const body = await (await GET()).json()
    expect(body.schema_checked).toBe(false)
    expect(body.card_order_intakes_columns.film).toBe(false)
    expect(body.card_order_intakes_columns.brief).toBe(true)
  })

  it('no service client: still 200 with the env answers, schema unchecked', async () => {
    ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('service key unset')
    })
    vi.stubEnv('MAILTRAP_API_KEY', SENTINEL)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.env.MAILTRAP_API_KEY).toBe(true)
    expect(body.schema_checked).toBe(false)
    expect(body.card_order_emails_table).toBe(false)
  })
})
