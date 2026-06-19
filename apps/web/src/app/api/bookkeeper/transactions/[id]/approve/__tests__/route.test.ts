import { describe, it, expect, vi, beforeEach } from 'vitest'

let chainResolve: any = { error: null }

function makeChain() {
  const b: Record<string, any> = {
    update: vi.fn(),
    eq: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.update.mockReturnValue(b)
  b.eq.mockReturnValue(b)
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

const params = Promise.resolve({ id: 'txn-1' })

describe('POST /api/bookkeeper/transactions/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { error: null }
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(401)
  })

  it('approves transaction and returns success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { error: null }

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 on DB update error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { error: { message: 'update failed' } }

    const res = await POST(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(500)
  })
})
