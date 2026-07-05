import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/xero/client', () => ({
  isXeroConfigured: vi.fn(),
  loadXeroTokens: vi.fn(),
  fetchInvoices: vi.fn(),
}))

import { isXeroConfigured, loadXeroTokens, fetchInvoices } from '@/lib/integrations/xero/client'
import {
  quarterSlug,
  getBASSummaryForExport,
  getTransactionsForExport,
  getInvoicesForExport,
  toBASCsv,
  toTransactionsCsv,
  toInvoicesCsv,
} from '../export'

function makeSupabase(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {}
  const passthrough = () => builder
  builder.select = passthrough
  builder.eq = passthrough
  builder.gte = passthrough
  builder.lte = passthrough
  builder.order = passthrough
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return { from: () => builder } as never
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('quarterSlug', () => {
  it('derives a filename-safe FY quarter slug', () => {
    expect(quarterSlug('2025-07-15')).toBe('Q1-FY2025-26')
    expect(quarterSlug('2026-02-01')).toBe('Q3-FY2025-26')
  })
})

describe('getBASSummaryForExport', () => {
  it('returns source: mock with zero real rows', async () => {
    const supabase = makeSupabase({ data: [] })
    const summary = await getBASSummaryForExport(supabase, 'founder-1', 'dr', '2025-07-01', '2025-09-30')
    expect(summary.source).toBe('mock')
    expect(summary.transactionCount).toBeGreaterThan(0)
  })

  it('aggregates real bookkeeper_transactions rows into BAS labels, source: xero', async () => {
    const supabase = makeSupabase({
      data: [
        { amount_cents: 11_000, gst_amount_cents: 1_000, tax_code: 'OUTPUT' },
        { amount_cents: -5_500, gst_amount_cents: -500, tax_code: 'INPUT' },
        { amount_cents: 2_000, gst_amount_cents: 0, tax_code: 'EXEMPTOUTPUT' },
      ],
    })
    const summary = await getBASSummaryForExport(supabase, 'founder-1', 'dr', '2025-07-01', '2025-09-30')
    expect(summary.source).toBe('xero')
    expect(summary.label1A_totalSalesCents).toBe(13_000) // 11000 OUTPUT + 2000 EXEMPTOUTPUT
    expect(summary.label1B_gstOnSalesCents).toBe(1_000)
    expect(summary.label7_totalPurchasesCents).toBe(5_500)
    expect(summary.label9_gstOnPurchasesCents).toBe(500)
    expect(summary.label11_gstPayableCents).toBe(500) // 1000 - 500
    expect(summary.transactionCount).toBe(3)
  })
})

describe('getTransactionsForExport', () => {
  it('falls back to a mock register when no real rows exist', async () => {
    const supabase = makeSupabase({ data: [] })
    const result = await getTransactionsForExport(supabase, 'founder-1', 'dr', '2025-07-01', '2025-09-30')
    expect(result.source).toBe('mock')
    expect(result.rows.length).toBeGreaterThan(0)
  })

  it('maps real rows through untouched, source: xero', async () => {
    const supabase = makeSupabase({
      data: [
        {
          transaction_date: '2025-07-05',
          description: 'Client payment',
          amount_cents: 55_000,
          gst_amount_cents: 5_000,
          tax_code: 'OUTPUT',
          reconciliation_status: 'auto_matched',
        },
      ],
    })
    const result = await getTransactionsForExport(supabase, 'founder-1', 'dr', '2025-07-01', '2025-09-30')
    expect(result.source).toBe('xero')
    expect(result.rows).toEqual([
      {
        transactionDate: '2025-07-05',
        description: 'Client payment',
        amountCents: 55_000,
        gstAmountCents: 5_000,
        taxCode: 'OUTPUT',
        reconciliationStatus: 'auto_matched',
      },
    ])
  })
})

describe('getInvoicesForExport', () => {
  it('returns mock when Xero is not configured', async () => {
    vi.mocked(isXeroConfigured).mockReturnValue(false)
    const result = await getInvoicesForExport('founder-1', 'dr', '2025-07-01', '2025-09-30')
    expect(result.source).toBe('mock')
    expect(fetchInvoices).not.toHaveBeenCalled()
  })

  it('returns mock when configured but no stored token for the business', async () => {
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    vi.mocked(loadXeroTokens).mockResolvedValue(null)
    const result = await getInvoicesForExport('founder-1', 'nrpg', '2025-07-01', '2025-09-30')
    expect(result.source).toBe('mock')
    expect(fetchInvoices).not.toHaveBeenCalled()
  })

  it('returns mock when the live Xero call throws', async () => {
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    vi.mocked(loadXeroTokens).mockResolvedValue({
      access_token: 'a', refresh_token: 'r', expires_at: Date.now() + 1000, tenant_id: 't',
    } as never)
    vi.mocked(fetchInvoices).mockRejectedValue(new Error('Xero API 401'))
    const result = await getInvoicesForExport('founder-1', 'dr', '2025-07-01', '2025-09-30')
    expect(result.source).toBe('mock')
  })

  it('returns real invoices, source: xero, when Xero calls succeed', async () => {
    vi.mocked(isXeroConfigured).mockReturnValue(true)
    vi.mocked(loadXeroTokens).mockResolvedValue({
      access_token: 'a', refresh_token: 'r', expires_at: Date.now() + 1000, tenant_id: 't',
    } as never)
    vi.mocked(fetchInvoices).mockImplementation(async (_founderId, _businessKey, options) => {
      if (options?.type === 'ACCREC') {
        return {
          items: [{
            InvoiceID: 'inv-1', Type: 'ACCREC', InvoiceNumber: 'INV-1', Contact: { ContactID: 'c1', Name: 'Acme' },
            Total: 5500, AmountDue: 0, AmountPaid: 5500, Status: 'PAID', Date: '2025-07-10', DueDate: '2025-07-24',
          }],
        } as never
      }
      return { items: [] } as never
    })

    const result = await getInvoicesForExport('founder-1', 'dr', '2025-07-01', '2025-09-30')
    expect(result.source).toBe('xero')
    expect(result.rows).toEqual([
      { date: '2025-07-10', invoiceNumber: 'INV-1', contactName: 'Acme', type: 'ACCREC', status: 'PAID', totalCents: 550_000, amountDueCents: 0 },
    ])
  })
})

describe('CSV serialisation — mock-banner rule', () => {
  it('BAS CSV carries the mock banner and never presents mock as real', () => {
    const csv = toBASCsv(
      { source: 'mock', label1A_totalSalesCents: 100, label1B_gstOnSalesCents: 10, label7_totalPurchasesCents: 50, label9_gstOnPurchasesCents: 5, label11_gstPayableCents: 5, transactionCount: 1 },
      'dr',
      'Q1-FY2025-26',
    )
    expect(csv.split('\n')[0]).toBe('# source: mock — NOT real financials')
    expect(csv).not.toContain('# source: xero')
  })

  it('BAS CSV carries the xero banner when source is real', () => {
    const csv = toBASCsv(
      { source: 'xero', label1A_totalSalesCents: 100, label1B_gstOnSalesCents: 10, label7_totalPurchasesCents: 50, label9_gstOnPurchasesCents: 5, label11_gstPayableCents: 5, transactionCount: 1 },
      'dr',
      'Q1-FY2025-26',
    )
    expect(csv.split('\n')[0]).toBe('# source: xero')
  })

  it('Transactions CSV escapes commas/quotes in description and formats cents as AUD', () => {
    const csv = toTransactionsCsv({
      source: 'xero',
      rows: [{
        transactionDate: '2025-07-05',
        description: 'Payment, incl. "GST"',
        amountCents: 12_345,
        gstAmountCents: 1_234,
        taxCode: 'OUTPUT',
        reconciliationStatus: 'auto_matched',
      }],
    })
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('# source: xero')
    expect(lines[2]).toBe('2025-07-05,"Payment, incl. ""GST""",123.45,12.34,OUTPUT,auto_matched')
  })

  it('Invoices CSV carries the mock banner when no real invoices were found', () => {
    const csv = toInvoicesCsv({
      source: 'mock',
      rows: [{ date: '2025-07-10', invoiceNumber: 'INV-1', contactName: 'Acme', type: 'ACCREC', status: 'AUTHORISED', totalCents: 550_000, amountDueCents: 0 }],
    })
    expect(csv.split('\n')[0]).toBe('# source: mock — NOT real financials')
  })
})

describe('CSV serialisation — formula injection neutralisation', () => {
  it('neutralises a =HYPERLINK(...) contact name with a leading apostrophe and quoting', () => {
    const csv = toInvoicesCsv({
      source: 'xero',
      rows: [{
        date: '2025-07-10',
        invoiceNumber: 'INV-9',
        contactName: '=HYPERLINK("http://evil.example","click")',
        type: 'ACCREC',
        status: 'AUTHORISED',
        totalCents: 100,
        amountDueCents: 0,
      }],
    })
    const row = csv.trim().split('\n')[2]
    // Apostrophe-prefixed, and force-quoted (contains quotes/commas) with doubled quotes.
    expect(row).toContain(`"'=HYPERLINK(""http://evil.example"",""click"")"`)
    expect(row.includes(',=HYPERLINK')).toBe(false)
  })

  it('neutralises a +-prefixed transaction description', () => {
    const csv = toTransactionsCsv({
      source: 'xero',
      rows: [{
        transactionDate: '2025-07-05',
        description: '+1-2+cmd|calc',
        amountCents: 100,
        gstAmountCents: 10,
        taxCode: 'OUTPUT',
        reconciliationStatus: 'auto_matched',
      }],
    })
    const row = csv.trim().split('\n')[2]
    expect(row).toBe(`2025-07-05,'+1-2+cmd|calc,1.00,0.10,OUTPUT,auto_matched`)
  })

  it('neutralises an @-prefixed invoice number', () => {
    const csv = toInvoicesCsv({
      source: 'mock',
      rows: [{
        date: '2025-07-10',
        invoiceNumber: '@SUM(1+9)',
        contactName: 'Acme',
        type: 'ACCREC',
        status: 'AUTHORISED',
        totalCents: 100,
        amountDueCents: 0,
      }],
    })
    const row = csv.trim().split('\n')[2]
    expect(row).toContain(`'@SUM(1+9)`)
    expect(row.includes(',@SUM')).toBe(false)
  })

  it('leaves amount columns untouched (negative amounts keep their leading minus)', () => {
    const csv = toTransactionsCsv({
      source: 'xero',
      rows: [{
        transactionDate: '2025-07-05',
        description: 'Refund',
        amountCents: -12_345,
        gstAmountCents: -1_234,
        taxCode: 'INPUT',
        reconciliationStatus: 'auto_matched',
      }],
    })
    const row = csv.trim().split('\n')[2]
    expect(row).toBe('2025-07-05,Refund,-123.45,-12.34,INPUT,auto_matched')
  })
})
