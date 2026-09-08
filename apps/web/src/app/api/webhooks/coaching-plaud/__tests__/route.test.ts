import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/cron-auth', () => ({ assertCronAuth: vi.fn(() => null) }))
vi.mock('@/lib/auth/founder-user-id', () => ({ getFounderUserId: vi.fn(() => 'founder-1') }))

import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

const ENGAGEMENT = {
  id: 'engagement-1',
  client_id: 'client-1',
  consent_given: true,
  consent_date: '2026-09-01',
  consent_method: 'written',
  consent_disclosure: 'AI transcription and coaching review',
}

function request(body: unknown): Request {
  return new Request('https://app.test/api/webhooks/coaching-plaud', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function client(opts: {
  engagement?: unknown
  upsert?: unknown
  duplicate?: unknown
}) {
  const engagementBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: opts.engagement ?? ENGAGEMENT, error: null }),
  }
  const sessionBuilder = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn()
      .mockResolvedValueOnce({ data: opts.upsert !== undefined ? opts.upsert : { id: 'session-1' }, error: null })
      .mockResolvedValueOnce({ data: opts.duplicate ?? null, error: null }),
  }
  return {
    from: vi.fn((table: string) => table === 'coaching_engagements' ? engagementBuilder : sessionBuilder),
    engagementBuilder,
    sessionBuilder,
  }
}

describe('POST /api/webhooks/coaching-plaud', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects null JSON bodies before reading webhook fields', async () => {
    const supabase = client({})
    vi.mocked(createServiceClient).mockReturnValue(supabase as never)

    const res = await POST(request('null'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_body')
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('requires a non-empty source_ref', async () => {
    const res = await POST(request({ engagement_id: 'engagement-1', transcript: 'words' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('source_ref_required')
  })

  it.each([
    ['session_date', '2026-02-30'],
    ['duration_minutes', -1],
    ['duration_minutes', 1.5],
    ['duration_minutes', '30'],
  ])('rejects invalid %s values', async (field, value) => {
    const body: Record<string, unknown> = {
      engagement_id: 'engagement-1', transcript: 'words', source_ref: 'plaud-1', [field]: value,
    }
    const res = await POST(request(body))
    expect(res.status).toBe(400)
  })

  it('returns the original session id for a duplicate source_ref delivery', async () => {
    const supabase = client({ upsert: null, duplicate: { id: 'existing-session' } })
    vi.mocked(createServiceClient).mockReturnValue(supabase as never)

    const res = await POST(request({
      engagement_id: 'engagement-1', transcript: 'words', source_ref: '  plaud-1  ',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ session_id: 'existing-session', status: 'captured', duplicate: true })
    expect(supabase.sessionBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ source_ref: 'plaud-1' }),
      { onConflict: 'founder_id,source_ref', ignoreDuplicates: true },
    )
  })

  it('creates a new session when source_ref has not been seen', async () => {
    const supabase = client({ upsert: { id: 'new-session' } })
    vi.mocked(createServiceClient).mockReturnValue(supabase as never)

    const res = await POST(request({
      engagement_id: 'engagement-1', transcript: 'words', source_ref: 'plaud-2', duration_minutes: 0,
    }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ session_id: 'new-session', status: 'captured' })
  })
})
