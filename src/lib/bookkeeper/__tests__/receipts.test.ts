import {
  extractAmountCentsFromText,
  scoreReceiptTransactionMatch,
  type ReceiptCandidate,
} from '../receipts'

const baseReceipt: ReceiptCandidate = {
  businessKey: 'carsi',
  accountEmail: 'support@carsi.com.au',
  provider: 'google',
  threadId: 'thread-1',
  messageId: 'message-1',
  attachmentId: null,
  filename: null,
  mimeType: null,
  sender: 'Officeworks <receipts@officeworks.com.au>',
  subject: 'Tax invoice',
  receivedAt: '2026-06-01T10:00:00.000Z',
  vendor: 'Officeworks',
  totalAmountCents: 12995,
  currency: 'AUD',
  snippet: 'Tax invoice attached',
}

describe('bookkeeper receipt helpers', () => {
  it('extracts AUD amounts from receipt-like text', () => {
    expect(extractAmountCentsFromText('Total paid $1,299.50 AUD')).toBe(129950)
    expect(extractAmountCentsFromText('Amount AUD 49.95')).toBe(4995)
    expect(extractAmountCentsFromText('No amount here')).toBeNull()
  })

  it('scores exact amount, vendor, and close date as high confidence', () => {
    const match = scoreReceiptTransactionMatch(baseReceipt, {
      id: 'txn-1',
      business_key: 'carsi',
      description: 'OFFICEWORKS ONLINE ORDER',
      amount_cents: -12995,
      transaction_date: '2026-06-02',
      reconciliation_status: 'manual_review',
    })

    expect(match?.confidence).toBeGreaterThanOrEqual(0.75)
    expect(match?.reasons).toContain('amount exact')
  })

  it('rejects weak matches', () => {
    const match = scoreReceiptTransactionMatch(baseReceipt, {
      id: 'txn-2',
      business_key: 'carsi',
      description: 'Unrelated supplier',
      amount_cents: -5000,
      transaction_date: '2026-01-01',
      reconciliation_status: 'manual_review',
    })

    expect(match).toBeNull()
  })
})
