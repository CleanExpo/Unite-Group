import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/margot/draft-store', () => ({ createMargotDraftStore: vi.fn() }))
vi.mock('@/lib/margot/send-on-approval', () => ({ approveAndSend: vi.fn() }))
vi.mock('@/lib/margot/providers', () => ({ sendStoredDraft: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createMargotDraftStore } from '@/lib/margot/draft-store'
import { approveAndSend } from '@/lib/margot/send-on-approval'
import { POST } from '../route'

const getDraft = vi.fn()
const stored = { id: 'd1', status: 'pending' }

function req(body?: unknown) {
  return new Request('http://localhost/api/margot/drafts/d1/approve', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'd1' }) }

describe('POST /api/margot/drafts/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MARGOT_DRAFTS_ENABLED = 'true'
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(createMargotDraftStore).mockReturnValue({
      getDraft,
      recordApproval: vi.fn(),
      markSent: vi.fn(),
    } as never)
    getDraft.mockResolvedValue(stored)
  })
  afterEach(() => {
    delete process.env.MARGOT_DRAFTS_ENABLED
  })

  it('refuses unauthenticated requests and sends nothing', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({}), ctx)
    expect(res.status).toBe(401)
    expect(getDraft).not.toHaveBeenCalled()
    expect(approveAndSend).not.toHaveBeenCalled()
  })

  it('is dormant (200, no send) when the flag is off', async () => {
    delete process.env.MARGOT_DRAFTS_ENABLED
    const res = await POST(req({}), ctx)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { dormant: boolean }).dormant).toBe(true)
    expect(approveAndSend).not.toHaveBeenCalled()
  })

  it("returns 404 when the draft is not the founder's", async () => {
    getDraft.mockResolvedValue(null)
    const res = await POST(req({}), ctx)
    expect(res.status).toBe(404)
    expect(getDraft).toHaveBeenCalledWith('d1', 'user-123')
    expect(approveAndSend).not.toHaveBeenCalled()
  })

  it('returns 400 when approve/send throws (approval gate refusal)', async () => {
    vi.mocked(approveAndSend).mockRejectedValue(new Error('draft not sendable'))
    const res = await POST(req({ via: 'ui' }), ctx)
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('draft not sendable')
  })

  it('approves and sends for the founder', async () => {
    vi.mocked(approveAndSend).mockResolvedValue({ draft: { status: 'sent' } } as never)
    const res = await POST(req({ via: 'telegram', note: 'ok' }), ctx)
    expect(res.status).toBe(200)
    expect(approveAndSend).toHaveBeenCalledWith(
      stored, 'user-123', 'telegram', expect.any(Object), 'ok',
    )
    expect(await res.json()).toEqual({ ok: true, status: 'sent' })
  })

  it('defaults via to ui when body is absent', async () => {
    vi.mocked(approveAndSend).mockResolvedValue({ draft: { status: 'sent' } } as never)
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect(vi.mocked(approveAndSend).mock.calls[0][2]).toBe('ui')
  })
})
