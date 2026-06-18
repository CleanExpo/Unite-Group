import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero/client', () => ({
  fetchInvoices: vi.fn(),
  createInvoice: vi.fn(),
  isXeroConfigured: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { fetchInvoices, createInvoice, isXeroConfigured } from '@/lib/integrations/xero/client'
import { GET, POST } from '../route'

describe('GET /api/xero/invoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/xero/invoices'))
    expect(res.status).toBe(401)
  })

  it('returns 503 when xero is not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(false)
    const res = await GET(new Request('https://app.test/api/xero/invoices'))
    expect(res.status).toBe(503)
  })

  it('returns invoices list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    const invoices = { invoices: [{ id: 'inv-1', amount: 500 }] }
    vi.mocked(fetchInvoices).mockResolvedValue(invoices as any)

    const res = await GET(new Request('https://app.test/api/xero/invoices?business=dr'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(invoices)
    expect(fetchInvoices).toHaveBeenCalledWith('user-1', 'dr', expect.any(Object))
  })

  it('returns 503 when no xero tokens found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    vi.mocked(fetchInvoices).mockRejectedValue(new Error('No Xero tokens found for business'))

    const res = await GET(new Request('https://app.test/api/xero/invoices'))
    expect(res.status).toBe(503)
  })
})

describe('POST /api/xero/invoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test/api/xero/invoices', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(401)
  })

  it('returns 503 when xero is not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(false)
    const res = await POST(new Request('https://app.test/api/xero/invoices', { method: 'POST', body: '{}' }))
    expect(res.status).toBe(503)
  })

  it('returns 400 when contactName is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    const res = await POST(
      new Request('https://app.test/api/xero/invoices', {
        method: 'POST',
        body: JSON.stringify({ dueDate: '2026-12-31', lineItems: [{ description: 'Work', quantity: 1, unitAmount: 100 }] }),
      }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'contactName is required' })
  })

  it('returns 400 when dueDate is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    const res = await POST(
      new Request('https://app.test/api/xero/invoices', {
        method: 'POST',
        body: JSON.stringify({ contactName: 'Acme', lineItems: [{ description: 'Work', quantity: 1, unitAmount: 100 }] }),
      }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'dueDate is required' })
  })

  it('creates an invoice and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    const created = { id: 'inv-new', status: 'DRAFT' }
    vi.mocked(createInvoice).mockResolvedValue(created as any)

    const res = await POST(
      new Request('https://app.test/api/xero/invoices', {
        method: 'POST',
        body: JSON.stringify({
          contactName: 'Acme',
          dueDate: '2026-12-31',
          lineItems: [{ description: 'Consulting', quantity: 1, unitAmount: 500 }],
        }),
      }),
    )
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ invoice: created })
  })
})
