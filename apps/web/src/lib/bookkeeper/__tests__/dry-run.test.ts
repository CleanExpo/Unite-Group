import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  StoredXeroTokens,
  XeroBankTransaction,
  XeroContact,
  XeroInvoice,
} from '@/lib/integrations/xero/types'

const mockLoadXeroTokens = vi.fn()
const mockGetValidXeroToken = vi.fn()
const mockSaveXeroTokens = vi.fn()
const mockFetchBankTransactions = vi.fn()
const mockFetchInvoices = vi.fn()
const mockFetchContacts = vi.fn()
const mockReconcileTransactions = vi.fn()

vi.mock('@/lib/integrations/xero/client', () => ({
  loadXeroTokens: (...args: unknown[]) => mockLoadXeroTokens(...args),
  getValidXeroToken: (...args: unknown[]) => mockGetValidXeroToken(...args),
  saveXeroTokens: (...args: unknown[]) => mockSaveXeroTokens(...args),
  fetchBankTransactions: (...args: unknown[]) => mockFetchBankTransactions(...args),
  fetchInvoices: (...args: unknown[]) => mockFetchInvoices(...args),
  fetchContacts: (...args: unknown[]) => mockFetchContacts(...args),
}))

vi.mock('@/lib/bookkeeper/reconciliation', () => ({
  reconcileTransactions: (...args: unknown[]) => mockReconcileTransactions(...args),
}))

import { runBookkeeperDryRun } from '../dry-run'

const FOUNDER_ID = 'founder-001'

function makeTokens(overrides: Partial<StoredXeroTokens> = {}): StoredXeroTokens {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Date.now() + 3600_000,
    tenant_id: 'tenant-001',
    ...overrides,
  }
}

function makeBankTransaction(overrides: Partial<XeroBankTransaction> = {}): XeroBankTransaction {
  return {
    BankTransactionID: 'txn-001',
    Type: 'SPEND',
    Contact: { ContactID: 'contact-001', Name: 'Supplier' },
    LineItems: [{ LineItemID: 'line-001', Description: 'Test transaction' }],
    BankAccount: { AccountID: 'bank-001' },
    Total: -110,
    Date: '2026-06-01T00:00:00',
    Status: 'AUTHORISED',
    IsReconciled: false,
    ...overrides,
  }
}

function makeInvoice(overrides: Partial<XeroInvoice> = {}): XeroInvoice {
  return {
    InvoiceID: 'invoice-001',
    Type: 'ACCPAY',
    InvoiceNumber: 'BILL-001',
    Contact: { ContactID: 'contact-001', Name: 'Supplier' },
    Total: 110,
    AmountDue: 110,
    AmountPaid: 0,
    Status: 'AUTHORISED',
    Date: '2026-06-01T00:00:00',
    DueDate: '2026-06-14T00:00:00',
    ...overrides,
  }
}

function makeContact(overrides: Partial<XeroContact> = {}): XeroContact {
  return {
    ContactID: 'contact-001',
    Name: 'Supplier',
    ...overrides,
  }
}

describe('runBookkeeperDryRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips an unconnected business without fetching Xero data', async () => {
    mockLoadXeroTokens.mockResolvedValue(null)

    const result = await runBookkeeperDryRun(FOUNDER_ID, 'nrpg')

    expect(result.mode).toBe('dry-run')
    expect(result.businessResults).toHaveLength(1)
    expect(result.businessResults[0]).toMatchObject({
      businessKey: 'nrpg',
      status: 'skipped',
      bankTransactionsFetched: 0,
    })
    expect(mockFetchBankTransactions).not.toHaveBeenCalled()
    expect(result.totals.skippedBusinesses).toBe(1)
  })

  it('returns a reconciliation preview without creating bookkeeping rows', async () => {
    const tokens = makeTokens()
    const transactions = [
      makeBankTransaction({ BankTransactionID: 'txn-001', IsReconciled: false }),
      makeBankTransaction({ BankTransactionID: 'txn-002', IsReconciled: true }),
    ]
    const invoices = [makeInvoice()]
    const contacts = [makeContact()]

    mockLoadXeroTokens.mockResolvedValue(tokens)
    mockGetValidXeroToken.mockResolvedValue(tokens)
    mockFetchBankTransactions.mockResolvedValue({
      items: transactions,
      pagination: { page: 1, pageCount: 3, pageSize: 100, itemCount: 250 },
    })
    mockFetchInvoices.mockResolvedValue({
      items: invoices,
      pagination: { page: 1, pageCount: 1, pageSize: 100, itemCount: 1 },
    })
    mockFetchContacts.mockResolvedValue(contacts)
    mockReconcileTransactions.mockReturnValue({
      matches: [],
      summary: {
        total: 2,
        autoMatched: 1,
        suggestedMatch: 0,
        manualReview: 1,
        unmatched: 0,
      },
    })

    const result = await runBookkeeperDryRun(FOUNDER_ID, 'carsi')

    expect(result.businessResults[0]).toMatchObject({
      businessKey: 'carsi',
      status: 'success',
      tenantId: 'tenant-001',
      bankTransactionsFetched: 2,
      bankTransactionPageCount: 3,
      alreadyReconciledInXero: 1,
      unreconciledInXero: 1,
      invoicesFetched: 1,
      contactsFetched: 1,
      reconciliationPreview: {
        autoMatched: 1,
        suggestedMatch: 0,
        manualReview: 1,
        unmatched: 0,
      },
    })
    expect(mockSaveXeroTokens).not.toHaveBeenCalled()
    expect(result.totals.connectedBusinesses).toBe(1)
    expect(result.totals.manualReview).toBe(1)
  })
})
