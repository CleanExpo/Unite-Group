// src/app/api/command-centre/signals/ingest/__tests__/route.test.ts
// TDD: POST /api/command-centre/signals/ingest — auth (founder session OR
// CRON_SECRET) + validation + delegation to ingestSignal.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/signals/ingest', () => ({ ingestSignal: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { ingestSignal } from '@/lib/command-centre/signals/ingest'
import { POST } from '../route'

const validBody = {
  source: 'telegram',
  externalRef: 'tg-123',
  text: 'Add a dark-mode toggle',
  observedAt: '2026-06-23T08:00:00.000Z',
}

const req = (b: object, headers: Record<string, string> = {}) =>
  new Request('https://app.test/api/command-centre/signals/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(b),
  })

describe('POST /api/command-centre/signals/ingest', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('401 when neither a session nor a valid CRON_SECRET is present', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req(validBody))
    expect(res.status).toBe(401)
  })

  it('400 when source is missing or unknown', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({ ...validBody, source: undefined }))).status).toBe(400)
    expect((await POST(req({ ...validBody, source: 'carrier-pigeon' }))).status).toBe(400)
  })

  it('400 when externalRef or text is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({ ...validBody, externalRef: undefined }))).status).toBe(400)
    expect((await POST(req({ ...validBody, text: undefined }))).status).toBe(400)
  })

  it('400 when text exceeds 4000 chars', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({ ...validBody, text: 'a'.repeat(4001) }))
    expect(res.status).toBe(400)
  })

  it('400 when externalRef is malformed (contains a space or exceeds 200 chars)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({ ...validBody, externalRef: 'has a space' }))).status).toBe(400)
    expect((await POST(req({ ...validBody, externalRef: 'a'.repeat(201) }))).status).toBe(400)
  })

  it('accepts a valid small payload (still succeeds)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(ingestSignal).mockResolvedValue({ status: 'created', task: { id: 't1' } as never })
    const res = await POST(req(validBody))
    expect(res.status).toBe(201)
  })

  it('201 and returns the created task on a fresh signal (founder session)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(ingestSignal).mockResolvedValue({ status: 'created', task: { id: 't1' } as never })
    const res = await POST(req(validBody))
    expect(res.status).toBe(201)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('created')
    expect(ingestSignal).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ingestSignal).mock.calls[0][0]).toBe('u1') // founderId
  })

  it('200 (not an error) when the signal is skipped as duplicate/noise', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(ingestSignal).mockResolvedValue({ status: 'skipped', reason: 'duplicate' })
    const res = await POST(req(validBody))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; reason: string }
    expect(body.status).toBe('skipped')
    expect(body.reason).toBe('duplicate')
  })

  it('accepts a machine caller with a valid CRON_SECRET and uses FOUNDER_USER_ID', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.stubEnv('FOUNDER_USER_ID', 'founder-uuid')
    vi.mocked(getUser).mockResolvedValue(null) // no session — cron path
    vi.mocked(ingestSignal).mockResolvedValue({ status: 'created', task: { id: 't1' } as never })
    const res = await POST(req(validBody, { authorization: 'Bearer s3cret' }))
    expect(res.status).toBe(201)
    expect(vi.mocked(ingestSignal).mock.calls[0][0]).toBe('founder-uuid')
  })
})
