import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/work-packet-store', () => ({ getWorkPacket: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { getWorkPacket } from '@/lib/command-centre/work-packet-store'
import { GET } from '../route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/command-center/work-packet/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({} as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/'), ctx('pkt-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when packet not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getWorkPacket).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/'), ctx('pkt-1'))
    expect(res.status).toBe(404)
  })

  it('returns 200 with packet on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getWorkPacket).mockResolvedValue({ id: 'pkt-1', status: 'queued' } as any)
    const res = await GET(new Request('https://app.test/'), ctx('pkt-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.packet.id).toBe('pkt-1')
  })
})
