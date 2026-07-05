// src/lib/bookkeeper/export.ts
// Accountant hand-off export pack: BAS summary, transaction register, and
// invoice register as CSV, per business + FY quarter.
//
// Reads real bookkeeper_transactions/Xero data when it exists. When no real
// rows exist yet (Xero not connected/configured — the case for every business
// today), falls back to a small illustrative fixture tagged `source: 'mock'`
// so the founder can preview the export format before Xero secrets land.
// Per lib/integrations/CLAUDE.md: mock data must never be presented as real.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getFinancialYearQuarter } from '@/lib/bookkeeper/bas-calculator'
import { fetchInvoices, isXeroConfigured, loadXeroTokens } from '@/lib/integrations/xero/client'
import type { XeroInvoice } from '@/lib/integrations/xero/types'

export type ExportSource = 'xero' | 'mock'

// ── BAS summary ──────────────────────────────────────────────────────────────

export interface ExportBASSummary {
  source: ExportSource
  label1A_totalSalesCents: number
  label1B_gstOnSalesCents: number
  label7_totalPurchasesCents: number
  label9_gstOnPurchasesCents: number
  label11_gstPayableCents: number
  transactionCount: number
}

const OUTPUT_CODES = new Set(['OUTPUT'])
const EXEMPT_OUTPUT_CODES = new Set(['EXEMPTOUTPUT', 'EXEMPTEXPORT'])
const INPUT_CODES = new Set(['INPUT', 'GSTONIMPORTS'])
const EXEMPT_INPUT_CODES = new Set(['EXEMPTINPUT', 'INPUTTAXED'])

export async function getBASSummaryForExport(
  supabase: SupabaseClient,
  founderId: string,
  businessKey: string,
  from: string,
  to: string,
): Promise<ExportBASSummary> {
  const { data } = await supabase
    .from('bookkeeper_transactions')
    .select('amount_cents, gst_amount_cents, tax_code')
    .eq('founder_id', founderId)
    .eq('business_key', businessKey)
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  const rows = (data ?? []) as Array<{ amount_cents: number; gst_amount_cents: number; tax_code: string | null }>

  if (rows.length === 0) return mockBASSummary()

  let label1A = 0, label1B = 0, label7 = 0, label9 = 0

  for (const row of rows) {
    const absAmount = Math.abs(Number(row.amount_cents))
    const gst = Math.abs(Number(row.gst_amount_cents))
    const taxCode = row.tax_code ?? ''

    if (OUTPUT_CODES.has(taxCode)) {
      label1A += absAmount
      label1B += gst
    } else if (EXEMPT_OUTPUT_CODES.has(taxCode)) {
      label1A += absAmount
    } else if (INPUT_CODES.has(taxCode)) {
      label7 += absAmount
      label9 += gst
    } else if (EXEMPT_INPUT_CODES.has(taxCode)) {
      label7 += absAmount
    }
  }

  return {
    source: 'xero',
    label1A_totalSalesCents: label1A,
    label1B_gstOnSalesCents: label1B,
    label7_totalPurchasesCents: label7,
    label9_gstOnPurchasesCents: label9,
    label11_gstPayableCents: label1B - label9,
    transactionCount: rows.length,
  }
}

function mockBASSummary(): ExportBASSummary {
  return {
    source: 'mock',
    label1A_totalSalesCents: 1_250_000,
    label1B_gstOnSalesCents: 125_000,
    label7_totalPurchasesCents: 640_000,
    label9_gstOnPurchasesCents: 64_000,
    label11_gstPayableCents: 61_000,
    transactionCount: 18,
  }
}

// ── Transaction register ──────────────────────────────────────────────────────

export interface ExportTransactionRow {
  transactionDate: string
  description: string | null
  amountCents: number
  gstAmountCents: number
  taxCode: string | null
  reconciliationStatus: string
}

export interface ExportTransactionsResult {
  source: ExportSource
  rows: ExportTransactionRow[]
}

export async function getTransactionsForExport(
  supabase: SupabaseClient,
  founderId: string,
  businessKey: string,
  from: string,
  to: string,
): Promise<ExportTransactionsResult> {
  const { data } = await supabase
    .from('bookkeeper_transactions')
    .select('transaction_date, description, amount_cents, gst_amount_cents, tax_code, reconciliation_status')
    .eq('founder_id', founderId)
    .eq('business_key', businessKey)
    .gte('transaction_date', from)
    .lte('transaction_date', to)
    .order('transaction_date', { ascending: true })

  const rows = (data ?? []) as Array<{
    transaction_date: string
    description: string | null
    amount_cents: number
    gst_amount_cents: number
    tax_code: string | null
    reconciliation_status: string
  }>

  if (rows.length === 0) return { source: 'mock', rows: mockTransactionRows(from) }

  return {
    source: 'xero',
    rows: rows.map((r) => ({
      transactionDate: r.transaction_date,
      description: r.description,
      amountCents: r.amount_cents,
      gstAmountCents: r.gst_amount_cents,
      taxCode: r.tax_code,
      reconciliationStatus: r.reconciliation_status,
    })),
  }
}

function mockTransactionRows(from: string): ExportTransactionRow[] {
  const base = new Date(from)
  const day = (n: number) =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + n).toISOString().slice(0, 10)
  return [
    { transactionDate: day(2), description: 'Client invoice payment', amountCents: 550_000, gstAmountCents: 50_000, taxCode: 'OUTPUT', reconciliationStatus: 'auto_matched' },
    { transactionDate: day(9), description: 'Software subscription', amountCents: -8_800, gstAmountCents: -800, taxCode: 'INPUT', reconciliationStatus: 'auto_matched' },
    { transactionDate: day(20), description: 'Contractor payment', amountCents: -220_000, gstAmountCents: -20_000, taxCode: 'INPUT', reconciliationStatus: 'manual_review' },
  ]
}

// ── Invoice register ──────────────────────────────────────────────────────────

export interface ExportInvoiceRow {
  date: string
  invoiceNumber: string
  contactName: string
  type: 'ACCREC' | 'ACCPAY'
  status: string
  totalCents: number
  amountDueCents: number
}

export interface ExportInvoicesResult {
  source: ExportSource
  rows: ExportInvoiceRow[]
}

export async function getInvoicesForExport(
  founderId: string,
  businessKey: string,
  from: string,
  to: string,
): Promise<ExportInvoicesResult> {
  if (!isXeroConfigured()) return { source: 'mock', rows: mockInvoiceRows(from) }

  const storedTokens = await loadXeroTokens(founderId, businessKey)
  if (!storedTokens) return { source: 'mock', rows: mockInvoiceRows(from) }

  try {
    const [sales, bills] = await Promise.all([
      fetchInvoices(founderId, businessKey, { fromDate: from, toDate: to, type: 'ACCREC' }),
      fetchInvoices(founderId, businessKey, { fromDate: from, toDate: to, type: 'ACCPAY' }),
    ])
    const invoices: XeroInvoice[] = [...sales.items, ...bills.items]
    return {
      source: 'xero',
      rows: invoices.map((inv) => ({
        date: inv.Date,
        invoiceNumber: inv.InvoiceNumber ?? inv.InvoiceID,
        contactName: inv.Contact.Name,
        type: inv.Type,
        status: inv.Status,
        totalCents: Math.round(inv.Total * 100),
        amountDueCents: Math.round(inv.AmountDue * 100),
      })),
    }
  } catch {
    return { source: 'mock', rows: mockInvoiceRows(from) }
  }
}

function mockInvoiceRows(from: string): ExportInvoiceRow[] {
  const base = new Date(from)
  const day = (n: number) =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate() + n).toISOString().slice(0, 10)
  return [
    { date: day(5), invoiceNumber: 'INV-1042', contactName: 'Acme Pty Ltd', type: 'ACCREC', status: 'AUTHORISED', totalCents: 550_000, amountDueCents: 0 },
    { date: day(14), invoiceNumber: 'BILL-2231', contactName: 'CloudHost Services', type: 'ACCPAY', status: 'AUTHORISED', totalCents: 8_800, amountDueCents: 8_800 },
  ]
}

// ── Quarter helpers ──────────────────────────────────────────────────────────

/** "Q1 FY2025-26 (Jul-Sep 2025)" -> "Q1-FY2025-26", for use in filenames. */
export function quarterSlug(fromDate: string): string {
  const { label } = getFinancialYearQuarter(new Date(fromDate))
  const match = label.match(/^(Q\d) FY(\d{4}-\d{2})/)
  return match ? `${match[1]}-FY${match[2]}` : label.replace(/\s+/g, '-')
}

// ── CSV serialisation ──────────────────────────────────────────────────────────

function csvEscape(value: string | number): string {
  let str = String(value)
  // Neutralise spreadsheet formula injection: a leading = + - @ (or tab/CR)
  // in free-text fields (description, contact name, invoice number) would
  // execute as a formula when the accountant opens the CSV in Excel.
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function centsToAud(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** The repo's loudest rule: never let a mock CSV pass as real. */
function sourceBanner(source: ExportSource): string {
  return source === 'mock' ? '# source: mock — NOT real financials' : '# source: xero'
}

export function toBASCsv(summary: ExportBASSummary, businessKey: string, quarterLabel: string): string {
  const lines = [
    sourceBanner(summary.source),
    ['Business', 'Quarter', 'Label', 'Description', 'AmountAUD'].join(','),
    [businessKey, quarterLabel, '1A', 'Total sales (GST inclusive)', centsToAud(summary.label1A_totalSalesCents)].join(','),
    [businessKey, quarterLabel, '1B', 'GST on sales', centsToAud(summary.label1B_gstOnSalesCents)].join(','),
    [businessKey, quarterLabel, '7', 'Total purchases (GST inclusive)', centsToAud(summary.label7_totalPurchasesCents)].join(','),
    [businessKey, quarterLabel, '9', 'GST on purchases', centsToAud(summary.label9_gstOnPurchasesCents)].join(','),
    [businessKey, quarterLabel, '11', 'Net GST payable', centsToAud(summary.label11_gstPayableCents)].join(','),
  ]
  return lines.join('\n') + '\n'
}

export function toTransactionsCsv(result: ExportTransactionsResult): string {
  const lines = [
    sourceBanner(result.source),
    ['Date', 'Description', 'AmountAUD', 'GSTAUD', 'TaxCode', 'ReconciliationStatus'].join(','),
    ...result.rows.map((r) =>
      [
        r.transactionDate,
        csvEscape(r.description ?? ''),
        centsToAud(r.amountCents),
        centsToAud(r.gstAmountCents),
        r.taxCode ?? '',
        r.reconciliationStatus,
      ].join(','),
    ),
  ]
  return lines.join('\n') + '\n'
}

export function toInvoicesCsv(result: ExportInvoicesResult): string {
  const lines = [
    sourceBanner(result.source),
    ['Date', 'InvoiceNumber', 'Contact', 'Type', 'Status', 'TotalAUD', 'AmountDueAUD'].join(','),
    ...result.rows.map((r) =>
      [
        r.date,
        csvEscape(r.invoiceNumber),
        csvEscape(r.contactName),
        r.type,
        r.status,
        centsToAud(r.totalCents),
        centsToAud(r.amountDueCents),
      ].join(','),
    ),
  ]
  return lines.join('\n') + '\n'
}
