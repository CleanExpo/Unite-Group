import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/social/channels', () => ({ deleteChannel: vi.fn() }))

import { DELETE } from '../route'
import { getUser } from '@/lib/supabase/server'
import { deleteChannel } from '@/lib/integrations/social/channels'

const CHANNEL_ID = 'chan-1'
const params = () => Promise.resolve({ id: CHANNEL_ID })
const req = () => new Request(`https://app.test/api/social/channels/${CHANNEL_ID}`, { method: 'DELETE' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/social/channels/[id]', () => {
  it('returns 401 when unauthenticated and never deletes', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await DELETE(req(), { params: params() })
    expect(res.status).toBe(401)
    expect(deleteChannel).not.toHaveBeenCalled()
  })

  it('deletes the channel for the session founder -> 200 { success: true }', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(deleteChannel).mockResolvedValue(undefined as never)

    const res = await DELETE(req(), { params: params() })
    expect(res.status).toBe(200)

    const json = (await res.json()) as { success: boolean }
    expect(json.success).toBe(true)
    expect(deleteChannel).toHaveBeenCalledWith('founder-1', CHANNEL_ID)
  })

  it('returns 404 when deleteChannel throws a PGRST116 (row-not-found) error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(deleteChannel).mockRejectedValue(new Error('PGRST116: no rows returned'))

    const res = await DELETE(req(), { params: params() })
    expect(res.status).toBe(404)

    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('Channel not found')
  })

  it('returns 500 when deleteChannel throws a generic error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(deleteChannel).mockRejectedValue(new Error('connection reset'))

    const res = await DELETE(req(), { params: params() })
    expect(res.status).toBe(500)

    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('Failed to disconnect channel')
  })
})
