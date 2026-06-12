import { BUSINESSES } from '@/lib/businesses'
import {
  fetchBankTransactions,
  fetchContacts,
  fetchInvoices,
  getValidXeroToken,
  loadXeroTokens,
  saveXeroTokens,
} from '@/lib/integrations/xero/client'
import { reconcileTransactions } from '@/lib/bookkeeper/reconciliation'

export interface BookkeeperDryRunBusinessResult {
  businessKey: string
  businessName: string
  status: 'success' | 'skipped' | 'error'
  error?: string
  tenantId?: string
  bankTransactionsFetched: number
  bankTransactionPageCount: number | null
  alreadyReconciledInXero: number
  unreconciledInXero: number
  invoicesFetched: number
  invoicePageCount: number | null
  contactsFetched: number
  reconciliationPreview: {
    autoMatched: number
    suggestedMatch: number
    manualReview: number
    unmatched: number
  }
}

export interface BookkeeperDryRunResult {
  mode: 'dry-run'
  generatedAt: string
  businessResults: BookkeeperDryRunBusinessResult[]
  totals: {
    connectedBusinesses: number
    skippedBusinesses: number
    errorBusinesses: number
    bankTransactionsFetched: number
    unreconciledInXero: number
    invoicesFetched: number
    contactsFetched: number
    manualReview: number
    unmatched: number
  }
}

async function dryRunOneBusiness(
  founderId: string,
  businessKey: string,
  businessName: string,
): Promise<BookkeeperDryRunBusinessResult> {
  const storedTokens = await loadXeroTokens(founderId, businessKey)
  if (!storedTokens) {
    return {
      businessKey,
      businessName,
      status: 'skipped',
      error: 'No Xero tokens found - business not connected',
      bankTransactionsFetched: 0,
      bankTransactionPageCount: null,
      alreadyReconciledInXero: 0,
      unreconciledInXero: 0,
      invoicesFetched: 0,
      invoicePageCount: null,
      contactsFetched: 0,
      reconciliationPreview: {
        autoMatched: 0,
        suggestedMatch: 0,
        manualReview: 0,
        unmatched: 0,
      },
    }
  }

  const validTokens = await getValidXeroToken(storedTokens, businessKey)
  if (validTokens.access_token !== storedTokens.access_token) {
    await saveXeroTokens(founderId, businessKey, validTokens)
  }

  try {
    const bankTransactions = await fetchBankTransactions(founderId, businessKey, { page: 1 })
    const invoices = await fetchInvoices(founderId, businessKey, { page: 1 })
    const contacts = await fetchContacts(founderId, businessKey)

    const reconciliation = reconcileTransactions(
      bankTransactions.items,
      invoices.items,
      contacts,
    )

    return {
      businessKey,
      businessName,
      status: 'success',
      tenantId: validTokens.tenant_id,
      bankTransactionsFetched: bankTransactions.items.length,
      bankTransactionPageCount: bankTransactions.pagination?.pageCount ?? null,
      alreadyReconciledInXero: bankTransactions.items.filter((txn) => txn.IsReconciled).length,
      unreconciledInXero: bankTransactions.items.filter((txn) => !txn.IsReconciled).length,
      invoicesFetched: invoices.items.length,
      invoicePageCount: invoices.pagination?.pageCount ?? null,
      contactsFetched: contacts.length,
      reconciliationPreview: {
        autoMatched: reconciliation.summary.autoMatched,
        suggestedMatch: reconciliation.summary.suggestedMatch,
        manualReview: reconciliation.summary.manualReview,
        unmatched: reconciliation.summary.unmatched,
      },
    }
  } catch (error) {
    return {
      businessKey,
      businessName,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      tenantId: validTokens.tenant_id,
      bankTransactionsFetched: 0,
      bankTransactionPageCount: null,
      alreadyReconciledInXero: 0,
      unreconciledInXero: 0,
      invoicesFetched: 0,
      invoicePageCount: null,
      contactsFetched: 0,
      reconciliationPreview: {
        autoMatched: 0,
        suggestedMatch: 0,
        manualReview: 0,
        unmatched: 0,
      },
    }
  }
}

export async function runBookkeeperDryRun(
  founderId: string,
  businessKey?: string,
): Promise<BookkeeperDryRunResult> {
  const businesses = BUSINESSES.filter((business) => {
    if (business.status !== 'active') return false
    return businessKey ? business.key === businessKey : true
  })

  const businessResults: BookkeeperDryRunBusinessResult[] = []
  for (const business of businesses) {
    businessResults.push(
      await dryRunOneBusiness(founderId, business.key, business.name),
    )
  }

  return {
    mode: 'dry-run',
    generatedAt: new Date().toISOString(),
    businessResults,
    totals: {
      connectedBusinesses: businessResults.filter((result) => result.status === 'success').length,
      skippedBusinesses: businessResults.filter((result) => result.status === 'skipped').length,
      errorBusinesses: businessResults.filter((result) => result.status === 'error').length,
      bankTransactionsFetched: businessResults.reduce(
        (sum, result) => sum + result.bankTransactionsFetched,
        0,
      ),
      unreconciledInXero: businessResults.reduce(
        (sum, result) => sum + result.unreconciledInXero,
        0,
      ),
      invoicesFetched: businessResults.reduce(
        (sum, result) => sum + result.invoicesFetched,
        0,
      ),
      contactsFetched: businessResults.reduce(
        (sum, result) => sum + result.contactsFetched,
        0,
      ),
      manualReview: businessResults.reduce(
        (sum, result) => sum + result.reconciliationPreview.manualReview,
        0,
      ),
      unmatched: businessResults.reduce(
        (sum, result) => sum + result.reconciliationPreview.unmatched,
        0,
      ),
    },
  }
}
