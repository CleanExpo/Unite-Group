import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero/client', () => ({
  isXeroConfigured: vi.fn(),
  updateInvoiceStatus: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { isXeroConfigured, updateInvoiceStatus } from '@/lib/integrations/xero/client'
import { POST } from '../route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

function req(id: string, business = 'dr') {
  return new Request(`https://app.test/api/xero/invoices/${id}/approve?business=${business}`)
}

describe('POST /api/xero/invoices/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    vi.mocked(updateInvoiceStatus).mockResolvedValue({ id: 'inv-1', status: 'AUTHORISED' } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req('inv-1'), ctx('inv-1'))
    expect(res.status).toBe(401)
  })

  it('returns 503 when Xero not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(false)
    const res = await POST(req('inv-1'), ctx('inv-1'))
    expect(res.status).toBe(503)
  })

  it('returns 503 when no Xero tokens for business', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(updateInvoiceStatus).mockRejectedValue(new Error('No Xero tokens found for business dr'))
    const res = await POST(req('inv-1'), ctx('inv-1'))
    expect(res.status).toBe(503)
  })

  it('returns 500 on other errors', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(updateInvoiceStatus).mockRejectedValue(new Error('Xero API error'))
    const res = await POST(req('inv-1'), ctx('inv-1'))
    expect(res.status).toBe(500)
  })

  it('returns 200 with approved invoice on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req('inv-1'), ctx('inv-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invoice.status).toBe('AUTHORISED')
  })
})
