import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    insert: vi.fn(),
    select: vi.fn(),
  }
  b.insert.mockReturnValue(b)
  b.select.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

let chain: ReturnType<typeof makeChain>
const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { POST } from '../route'

const params = Promise.resolve({ id: 'meeting-1' })

function req(body: object) {
  return new Request('https://app.test/api/boardroom/meetings/meeting-1/notes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/boardroom/meetings/[id]/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ content: 'Notes' }), { params })
    expect(res.status).toBe(401)
  })

  it('returns 400 when content is empty', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ content: '   ' }), { params })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'content required' })
  })

  it('creates a note and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const note = { id: 'n-1', meeting_id: 'meeting-1', content: 'Q3 target met' }
    mockSingle.mockResolvedValue({ data: note, error: null })

    const res = await POST(req({ content: 'Q3 target met' }), { params })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.note.id).toBe('n-1')
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const res = await POST(req({ content: 'Notes here' }), { params })
    expect(res.status).toBe(500)
  })
})
