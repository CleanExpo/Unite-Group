import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchFullThread,
  fetchThreadsPaginated,
  getConnectedGoogleAccounts,
  type FullMessage,
  type GmailThread,
} from '@/lib/integrations/google'
import {
  accountByEmail,
  getOwnedReceiptAccounts,
  type EmailAccount,
} from '@/lib/email-accounts'

const RECEIPT_QUERY =
  '(receipt OR invoice OR "tax invoice" OR "order confirmation" OR paid OR payment) newer_than:365d'

const RECEIPT_KEYWORDS = [
  'receipt',
  'invoice',
  'tax invoice',
  'order confirmation',
  'payment receipt',
  'paid',
]

interface BookkeeperTransactionRow {
  id: string
  business_key: string
  description: string | null
  amount_cents: number
  transaction_date: string
  reconciliation_status: string
}

export interface ReceiptCandidate {
  businessKey: string
  accountEmail: string
  provider: 'google'
  threadId: string
  messageId: string
  attachmentId: string | null
  filename: string | null
  mimeType: string | null
  sender: string
  subject: string
  receivedAt: string | null
  vendor: string | null
  totalAmountCents: number | null
  currency: 'AUD'
  snippet: string
}

export interface ReceiptMatchCandidate {
  transactionId: string
  description: string | null
  amountCents: number
  transactionDate: string
  confidence: number
  reasons: string[]
}

export interface ReceiptDryRunCandidate extends ReceiptCandidate {
  matches: ReceiptMatchCandidate[]
}

export interface ReceiptDryRunAccountResult {
  accountEmail: string
  businessKey: string
  label: string
  provider: 'google'
  connected: boolean
  scannedThreads: number
  candidates: ReceiptDryRunCandidate[]
  error?: string
}

export interface ReceiptDryRunResult {
  query: string
  accounts: ReceiptDryRunAccountResult[]
  totalCandidates: number
  totalCandidateMatches: number
}

function normalizeText(value: string): string {
  return value.toLowerCase()
}

function textLooksLikeReceipt(...values: Array<string | null | undefined>): boolean {
  const combined = normalizeText(values.filter(Boolean).join(' '))
  return RECEIPT_KEYWORDS.some((keyword) => combined.includes(keyword))
}

export function extractAmountCentsFromText(text: string): number | null {
  const match = text.match(/(?:AUD\s*)?\$?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\.([0-9]{2})/)
  if (!match) return null

  const dollars = Number.parseInt(match[1].replace(/,/g, ''), 10)
  const cents = Number.parseInt(match[2], 10)
  if (!Number.isFinite(dollars) || !Number.isFinite(cents)) return null
  return dollars * 100 + cents
}

function vendorFromSender(sender: string): string | null {
  const emailMatch = sender.match(/<([^>]+)>/)
  const email = emailMatch?.[1] ?? sender
  const name = sender.replace(/<[^>]+>/g, '').replace(/"/g, '').trim()
  if (name) return name
  const domain = email.split('@')[1]?.split('.')[0]
  return domain ? domain.replace(/[-_]/g, ' ') : null
}

function messageToCandidates(
  thread: GmailThread,
  message: FullMessage,
): ReceiptCandidate[] {
  const text = [
    thread.subject,
    thread.snippet,
    message.bodyText,
    message.bodyHtml?.replace(/<[^>]*>/g, ' '),
  ].join(' ')

  if (!textLooksLikeReceipt(thread.subject, thread.snippet, text)) return []

  const base = {
    businessKey: accountByEmail(thread.email)?.businessKey ?? thread.businessKey,
    accountEmail: thread.email,
    provider: 'google' as const,
    threadId: thread.id,
    messageId: message.id,
    sender: message.from || thread.from,
    subject: thread.subject,
    receivedAt: message.date || thread.date || null,
    vendor: vendorFromSender(message.from || thread.from),
    totalAmountCents: extractAmountCentsFromText(text),
    currency: 'AUD' as const,
    snippet: thread.snippet,
  }

  if (message.attachments.length === 0) {
    return [{
      ...base,
      attachmentId: null,
      filename: null,
      mimeType: null,
    }]
  }

  return message.attachments.map((attachment) => ({
    ...base,
    attachmentId: attachment.attachmentId,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
  }))
}

export function scoreReceiptTransactionMatch(
  receipt: ReceiptCandidate,
  transaction: BookkeeperTransactionRow,
): ReceiptMatchCandidate | null {
  const reasons: string[] = []
  let score = 0

  if (receipt.totalAmountCents !== null) {
    const amountDelta = Math.abs(Math.abs(transaction.amount_cents) - receipt.totalAmountCents)
    if (amountDelta === 0) {
      score += 0.55
      reasons.push('amount exact')
    } else if (amountDelta <= 100) {
      score += 0.35
      reasons.push('amount within $1')
    }
  }

  if (receipt.vendor && transaction.description) {
    const vendor = normalizeText(receipt.vendor)
    const description = normalizeText(transaction.description)
    if (vendor.length >= 3 && description.includes(vendor.slice(0, 12))) {
      score += 0.25
      reasons.push('vendor appears in transaction description')
    }
  }

  if (receipt.receivedAt) {
    const receiptTime = new Date(receipt.receivedAt).getTime()
    const transactionTime = new Date(transaction.transaction_date).getTime()
    if (Number.isFinite(receiptTime) && Number.isFinite(transactionTime)) {
      const dayDelta = Math.abs(receiptTime - transactionTime) / 86_400_000
      if (dayDelta <= 3) {
        score += 0.2
        reasons.push('date within 3 days')
      } else if (dayDelta <= 10) {
        score += 0.1
        reasons.push('date within 10 days')
      }
    }
  }

  if (score < 0.45) return null

  return {
    transactionId: transaction.id,
    description: transaction.description,
    amountCents: transaction.amount_cents,
    transactionDate: transaction.transaction_date,
    confidence: Math.min(1, Number(score.toFixed(2))),
    reasons,
  }
}

async function findReceiptMatches(
  supabase: SupabaseClient,
  founderId: string,
  receipt: ReceiptCandidate,
): Promise<ReceiptMatchCandidate[]> {
  const { data, error } = await supabase
    .from('bookkeeper_transactions')
    .select('id, business_key, description, amount_cents, transaction_date, reconciliation_status')
    .eq('founder_id', founderId)
    .eq('business_key', receipt.businessKey)
    .order('transaction_date', { ascending: false })
    .limit(200)

  if (error) throw new Error(`Failed to load bookkeeper transactions: ${error.message}`)

  return ((data ?? []) as BookkeeperTransactionRow[])
    .map((transaction) => scoreReceiptTransactionMatch(receipt, transaction))
    .filter((match): match is ReceiptMatchCandidate => Boolean(match))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}

function connectedOwnedGoogleAccounts(
  configuredAccounts: EmailAccount[],
  connectedEmails: Set<string>,
): EmailAccount[] {
  return configuredAccounts.filter((account) => connectedEmails.has(account.email))
}

export async function scanReceiptCandidatesDryRun(
  founderId: string,
  supabase: SupabaseClient,
  options: {
    businessKey?: string
    accountEmail?: string
    maxThreadsPerAccount?: number
  } = {},
): Promise<ReceiptDryRunResult> {
  const configuredAccounts = getOwnedReceiptAccounts('google').filter((account) => {
    if (options.businessKey && account.businessKey !== options.businessKey) return false
    if (options.accountEmail && account.email !== options.accountEmail) return false
    return true
  })

  const connectedAccounts = await getConnectedGoogleAccounts(founderId)
  const connectedEmails = new Set(connectedAccounts.map((account) => account.email))
  const accountsToScan = connectedOwnedGoogleAccounts(configuredAccounts, connectedEmails)
  const accountResults: ReceiptDryRunAccountResult[] = []

  for (const account of configuredAccounts) {
    if (!accountsToScan.includes(account)) {
      accountResults.push({
        accountEmail: account.email,
        businessKey: account.businessKey,
        label: account.label,
        provider: 'google',
        connected: false,
        scannedThreads: 0,
        candidates: [],
      })
      continue
    }

    try {
      const page = await fetchThreadsPaginated(founderId, account.email, {
        query: RECEIPT_QUERY,
        maxResults: options.maxThreadsPerAccount ?? 10,
      })

      const dryRunCandidates: ReceiptDryRunCandidate[] = []

      for (const thread of page.threads) {
        const fullThread = await fetchFullThread(founderId, account.email, thread.id)
        for (const message of fullThread.messages) {
          const candidates = messageToCandidates(thread, message)
          for (const candidate of candidates) {
            const matches = await findReceiptMatches(supabase, founderId, candidate)
            dryRunCandidates.push({ ...candidate, matches })
          }
        }
      }

      accountResults.push({
        accountEmail: account.email,
        businessKey: account.businessKey,
        label: account.label,
        provider: 'google',
        connected: true,
        scannedThreads: page.threads.length,
        candidates: dryRunCandidates,
      })
    } catch (err) {
      accountResults.push({
        accountEmail: account.email,
        businessKey: account.businessKey,
        label: account.label,
        provider: 'google',
        connected: true,
        scannedThreads: 0,
        candidates: [],
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    query: RECEIPT_QUERY,
    accounts: accountResults,
    totalCandidates: accountResults.reduce((sum, account) => sum + account.candidates.length, 0),
    totalCandidateMatches: accountResults.reduce(
      (sum, account) =>
        sum + account.candidates.filter((candidate) => candidate.matches.length > 0).length,
      0,
    ),
  }
}
