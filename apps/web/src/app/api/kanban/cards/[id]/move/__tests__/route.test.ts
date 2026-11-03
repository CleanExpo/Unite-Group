import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/kanban/store', () => ({ moveTask: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({
  sanitiseError: vi.fn((_e: unknown, fallback: string) => fallback),
}))

import { getUser } from '@/lib/supabase/server'
import { moveTask } from '@/lib/kanban/store'
import { PATCH } from '../route'

function req(body: unknown) {
  return new Request('http://localhost/api/kanban/cards/c1/move', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'card-1' }) }

describe('PATCH /api/kanban/cards/[id]/move', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(moveTask).mockResolvedValue(true as never)
  })

  it('refuses unauthenticated requests and does not move', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await PATCH(req({ status: 'done', index: 1 }), ctx)
    expect(res.status).toBe(401)
    expect(moveTask).not.toHaveBeenCalled()
  })

  it('rejects an invalid status', async () => {
    const res = await PATCH(req({ status: 'bogus' }), ctx)
    expect(res.status).toBe(400)
    expect(moveTask).not.toHaveBeenCalled()
  })

  it('rejects a malformed body', async () => {
    const res = await PATCH(req('not json'), ctx)
    expect(res.status).toBe(400)
    expect(moveTask).not.toHaveBeenCalled()
  })

  it('moves the card scoped to the founder', async () => {
    const res = await PATCH(req({ status: 'done', index: 2 }), ctx)
    expect(res.status).toBe(200)
    expect(moveTask).toHaveBeenCalledWith('user-123', 'card-1', 'done', 2)
    expect(await res.json()).toEqual({ ok: true, status: 'done', index: 2 })
  })

  it('defaults a non-integer index to 0', async () => {
    const res = await PATCH(req({ status: 'todo', index: 1.5 }), ctx)
    expect(res.status).toBe(200)
    expect(moveTask).toHaveBeenCalledWith('user-123', 'card-1', 'todo', 0)
  })

  it('returns 404 when the card does not exist or is not the founder\'s (UNI-3079)', async () => {
    vi.mocked(moveTask).mockResolvedValue(false as never)
    const res = await PATCH(req({ status: 'done', index: 0 }), ctx)
    expect(res.status).toBe(404)
    expect(((await res.json()) as { ok?: boolean }).ok).not.toBe(true)
  })

  it('returns 500 with a generic message when the store fails (UNI-3079)', async () => {
    vi.mocked(moveTask).mockRejectedValue(new Error('kanban_task move: relation does not exist'))
    const res = await PATCH(req({ status: 'done', index: 0 }), ctx)
    expect(res.status).toBe(500)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('Failed to move card')
    expect(JSON.stringify(json)).not.toContain('relation')
  })
})
