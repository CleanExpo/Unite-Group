import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
let updateResolve: any = { error: null }

function makeFetchChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

function makeUpdateChain() {
  const b: Record<string, any> = {
    update: vi.fn(),
    eq: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(updateResolve).then(onFulfilled, onRejected)
    },
  }
  b.update.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  return b
}

const mockFromImpl = vi.fn()
const mockClient = { from: mockFromImpl }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/integrations/xero/client', () => ({
  reconcileTransaction: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { reconcileTransaction } from '@/lib/integrations/xero/client'
import { POST } from '../route'

const params = Promise.resolve({ id: 'txn-1' })

function req(body: object = {}) {
  return new Request('https://app.test/api/bookkeeper/transactions/txn-1/reconcile', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/bookkeeper/transactions/[id]/reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateResolve = { error: null }
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when transaction not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockFromImpl.mockReturnValue(makeFetchChain())

    const res = await POST(req(), { params })
    expect(res.status).toBe(404)
  })

  it('reconciles and returns success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(reconcileTransaction).mockResolvedValue(undefined)

    const txn = { business_key: 'dr', xero_transaction_id: 'xero-1', xero_tenant_id: 'tenant-1' }
    mockSingle.mockResolvedValue({ data: txn, error: null })

    let callCount = 0
    mockFromImpl.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeFetchChain()
      return makeUpdateChain()
    })

    const res = await POST(req({ invoiceId: 'inv-1' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when reconcileTransaction throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(reconcileTransaction).mockRejectedValue(new Error('Xero API error'))

    const txn = { business_key: 'dr', xero_transaction_id: 'x-1', xero_tenant_id: 't-1' }
    mockSingle.mockResolvedValue({ data: txn, error: null })
    mockFromImpl.mockReturnValue(makeFetchChain())

    const res = await POST(req(), { params })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Xero API error')
  })
})
