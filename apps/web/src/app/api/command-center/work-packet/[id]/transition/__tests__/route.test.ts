import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/work-packet-store', () => ({ applyPacketTransition: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { applyPacketTransition } from '@/lib/command-centre/work-packet-store'
import { POST } from '../route'

function req(body: object) {
  return new NextRequest('https://app.test/api/command-center/work-packet/pkt-1/transition', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('POST /api/command-center/work-packet/[id]/transition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({} as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ type: 'start' }), ctx('pkt-1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when invalid event type', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ type: 'invalid_event' }), ctx('pkt-1'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when packet not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(applyPacketTransition).mockResolvedValue({ ok: false, packet: null, reason: 'not found' })
    const res = await POST(req({ type: 'start' }), ctx('pkt-1'))
    expect(res.status).toBe(404)
  })

  it('returns 409 when transition refused', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(applyPacketTransition).mockResolvedValue({
      ok: false,
      packet: { id: 'pkt-1', status: 'queued' } as any,
      reason: 'must be routed first',
    })
    const res = await POST(req({ type: 'complete' }), ctx('pkt-1'))
    expect(res.status).toBe(409)
  })

  it('returns 200 on successful transition', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(applyPacketTransition).mockResolvedValue({
      ok: true,
      packet: { id: 'pkt-1', status: 'in_progress' } as any,
      reason: undefined,
    })
    const res = await POST(req({ type: 'start' }), ctx('pkt-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.packet.status).toBe('in_progress')
  })
})
