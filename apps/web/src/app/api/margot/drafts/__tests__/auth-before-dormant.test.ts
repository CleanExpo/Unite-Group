import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/margot/draft-reply', () => ({ generateFounderDraft: vi.fn() }))
vi.mock('@/lib/margot/providers', () => ({ createAnthropicComplete: vi.fn() }))
vi.mock('@/lib/margot/draft-store', () => ({ createMargotDraftStore: vi.fn() }))
vi.mock('@/lib/margot/account-voice', () => ({ getAccountVoice: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { generateFounderDraft } from '@/lib/margot/draft-reply'
import { createMargotDraftStore } from '@/lib/margot/draft-store'
import { POST } from '../route'

function post() {
  return new Request('http://localhost/api/margot/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incoming: { body: 'hi' }, accountEmail: 'a@example.com' }),
  }) as never
}

// UNI-3079: the session check runs before the dormant flag, so an
// unauthenticated caller can never read the route's feature state.
describe('POST /api/margot/drafts — auth before dormant (UNI-3079)', () => {
  const saved = process.env.MARGOT_DRAFTS_ENABLED

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MARGOT_DRAFTS_ENABLED
  })

  afterEach(() => {
    if (saved === undefined) delete process.env.MARGOT_DRAFTS_ENABLED
    else process.env.MARGOT_DRAFTS_ENABLED = saved
  })

  it('returns 401 to an unauthenticated caller while dormant, without the dormant body', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(post())
    expect(res.status).toBe(401)
    const json = (await res.json()) as Record<string, unknown>
    expect(json).toEqual({ error: 'Unauthorised' })
    expect(json).not.toHaveProperty('dormant')
    expect(generateFounderDraft).not.toHaveBeenCalled()
    expect(createMargotDraftStore).not.toHaveBeenCalled()
  })

  it('returns the dormant no-op to an authenticated caller when the flag is off', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    const res = await POST(post())
    expect(res.status).toBe(200)
    expect(((await res.json()) as { dormant: boolean }).dormant).toBe(true)
    expect(generateFounderDraft).not.toHaveBeenCalled()
    expect(createMargotDraftStore).not.toHaveBeenCalled()
  })
})
