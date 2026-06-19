import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/sessions', () => ({
  applySessionAction: vi.fn(),
  SESSION_ACTIONS: ['pause', 'resume', 'complete', 'fail'],
}))

import { getUser } from '@/lib/supabase/server'
import { applySessionAction } from '@/lib/command-centre/sessions'
import { PATCH } from '../route'

const params = Promise.resolve({ id: 'sess-1' })

function patchReq(body: object) {
  return new Request('https://app.test/api/command-centre/sessions/sess-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/command-centre/sessions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(patchReq({ action: 'complete' }), { params })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid action', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await PATCH(patchReq({ action: 'destroy' }), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/action/)
  })

  it('returns 404 when session not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(applySessionAction).mockResolvedValue({ ok: false, reason: 'not_found' } as any)

    const res = await PATCH(patchReq({ action: 'complete' }), { params })
    expect(res.status).toBe(404)
  })

  it('returns 409 for invalid transition', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(applySessionAction).mockResolvedValue({
      ok: false,
      reason: 'invalid_transition',
      from: 'completed',
    } as any)

    const res = await PATCH(patchReq({ action: 'pause' }), { params })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.from).toBe('completed')
  })

  it('applies action and returns updated session', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(applySessionAction).mockResolvedValue({
      ok: true,
      session: { id: 'sess-1', status: 'completed' },
    } as any)

    const res = await PATCH(patchReq({ action: 'complete' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session.status).toBe('completed')
  })
})
