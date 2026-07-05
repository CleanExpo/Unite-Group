'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BASLabel } from '../shared/BASLabel'
import { BusinessFilter } from '../shared/BusinessFilter'
import { formatAUD, formatDate } from '../shared/formatters'
import { BUSINESSES, type BusinessKey } from '@/lib/businesses'
import type { BASQuarterSummary, BASResponse, BookkeeperTransaction, TransactionsResponse } from '@/lib/bookkeeper/types'

const DEFAULT_EXPORT_BUSINESS: BusinessKey = 'dr'

/** Accountant hand-off pack: BAS summary, transaction register, invoice register CSVs. */
export function AccountantPackDownload({ business, quarter }: { business: BusinessKey; quarter: BASQuarterSummary }) {
  // Server-reported data source, read from the export's own `# source:` banner
  // line so the founder knows the pack is mock BEFORE downloading it.
  const [source, setSource] = useState<'mock' | 'xero' | null>(null)

  const params = new URLSearchParams({
    business,
    from: quarter.startDate,
    to: quarter.endDate,
  }).toString()

  useEffect(() => {
    let cancelled = false
    setSource(null)
    async function probe() {
      try {
        const res = await fetch(`/api/bookkeeper/export/bas?${params}`)
        if (!res.ok) return
        const text = await res.text()
        if (!cancelled) setSource(text.startsWith('# source: mock') ? 'mock' : 'xero')
      } catch {
        // Source unknown — render no badge rather than a wrong one.
      }
    }
    void probe()
    return () => { cancelled = true }
  }, [params])

  const links: Array<{ label: string; href: string }> = [
    { label: 'BAS summary', href: `/api/bookkeeper/export/bas?${params}` },
    { label: 'Transactions', href: `/api/bookkeeper/export/transactions?${params}` },
    { label: 'Invoices', href: `/api/bookkeeper/export/invoices?${params}` },
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-disabled)' }}>
        Accountant pack:
      </span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          download
          className="text-[11px] px-2 py-1 rounded-sm border transition-colors hover:bg-black/[0.05]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          {link.label}
        </a>
      ))}
      {source === 'mock' && (
        <span
          className="text-[9px] font-medium tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
          style={{ color: '#eab308', backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
        >
          Preview data — mock, Xero not connected
        </span>
      )}
      {source === 'xero' && (
        <span className="text-[9px] font-medium tracking-widest uppercase" style={{ color: 'var(--color-text-disabled)' }}>
          Source: Xero
        </span>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--color-border)] rounded-sm p-4 animate-pulse">
      <div className="h-4 w-40 bg-white/5 rounded-sm mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-24 bg-white/5 rounded-sm" />
            <div className="h-3 w-16 bg-white/5 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniTransactionTable({ transactions, loading }: { transactions: BookkeeperTransaction[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="h-3 w-16 bg-white/5 rounded-sm" />
            <div className="h-3 w-32 bg-white/5 rounded-sm" />
            <div className="h-3 w-16 bg-white/5 rounded-sm" />
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <p className="text-[12px] py-3" style={{ color: 'var(--color-text-disabled)' }}>
        No transactions in this quarter.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto border border-[var(--color-border)] rounded-sm mt-3">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <th className="text-left px-2.5 py-2 font-medium" style={{ color: 'var(--color-text-disabled)' }}>Date</th>
            <th className="text-left px-2.5 py-2 font-medium" style={{ color: 'var(--color-text-disabled)' }}>Business</th>
            <th className="text-left px-2.5 py-2 font-medium" style={{ color: 'var(--color-text-disabled)' }}>Description</th>
            <th className="text-right px-2.5 py-2 font-medium" style={{ color: 'var(--color-text-disabled)' }}>Amount</th>
            <th className="text-right px-2.5 py-2 font-medium" style={{ color: 'var(--color-text-disabled)' }}>GST</th>
            <th className="text-left px-2.5 py-2 font-medium" style={{ color: 'var(--color-text-disabled)' }}>Tax Code</th>
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, 50).map((tx) => {
            const biz = BUSINESSES.find(b => b.key === tx.businessKey)
            return (
              <tr key={tx.id} className="border-b border-[var(--color-border)] hover:bg-black/[0.05] transition-colors">
                <td className="px-2.5 py-1.5 tabular-nums whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDate(tx.transactionDate)}
                </td>
                <td className="px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: biz?.color ?? '#888' }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>{biz?.name ?? tx.businessKey}</span>
                  </div>
                </td>
                <td className="px-2.5 py-1.5 max-w-[180px] truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {tx.description ?? '--'}
                </td>
                <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                  {formatAUD(tx.amountCents)}
                </td>
                <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatAUD(tx.gstAmountCents)}
                </td>
                <td className="px-2.5 py-1.5 font-mono" style={{ color: 'var(--color-text-disabled)' }}>
                  {tx.taxCode ?? '--'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {transactions.length > 50 && (
        <div className="px-2.5 py-2 text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>
          Showing 50 of {transactions.length} transactions
        </div>
      )}
    </div>
  )
}

/** Determine if a quarter is the "current" quarter based on today's date */
function isCurrentQuarter(q: BASQuarterSummary): boolean {
  const now = Date.now()
  return new Date(q.startDate).getTime() <= now && now <= new Date(q.endDate).getTime()
}

/** The most recent fully completed quarter (not current, needs lodging) */
function isDueQuarter(quarters: BASQuarterSummary[], q: BASQuarterSummary): boolean {
  const now = Date.now()
  const completed = quarters
    .filter(qtr => new Date(qtr.endDate).getTime() < now)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  return completed.length > 0 && completed[0].label === q.label
}

export function BASTab() {
  const [quarters, setQuarters] = useState<BASQuarterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null)
  const [quarterTransactions, setQuarterTransactions] = useState<BookkeeperTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [transactionsError, setTransactionsError] = useState(false)
  const [exportBusiness, setExportBusiness] = useState<BusinessKey | 'all'>(DEFAULT_EXPORT_BUSINESS)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/bookkeeper/bas')
        if (!res.ok) throw new Error(`Failed to fetch BAS data: ${res.status}`)
        const json = (await res.json()) as BASResponse
        if (!cancelled) setQuarters(json.quarters)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const fetchQuarterTransactions = useCallback(async (q: BASQuarterSummary) => {
    setLoadingTransactions(true)
    setTransactionsError(false)
    try {
      const params = new URLSearchParams({
        from: q.startDate,
        to: q.endDate,
        pageSize: '200',
      })
      const res = await fetch(`/api/bookkeeper/transactions?${params}`)
      if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.status}`)
      const json = (await res.json()) as TransactionsResponse
      setQuarterTransactions(json.transactions)
    } catch {
      // Honest: a load failure must not render as "No transactions in this quarter".
      setQuarterTransactions([])
      setTransactionsError(true)
    } finally {
      setLoadingTransactions(false)
    }
  }, [])

  const handleToggle = (q: BASQuarterSummary) => {
    if (expandedQuarter === q.label) {
      setExpandedQuarter(null)
      setQuarterTransactions([])
    } else {
      setExpandedQuarter(q.label)
      void fetchQuarterTransactions(q)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-[var(--color-danger)]/20 rounded-sm p-4 text-[13px]" style={{ color: 'var(--color-danger)' }}>
        {error}
      </div>
    )
  }

  if (quarters.length === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-sm p-8 text-center">
        <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          No BAS data available yet.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
          Accountant pack business:
        </span>
        <BusinessFilter value={exportBusiness} onChange={setExportBusiness} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {quarters.map((q) => {
        const current = isCurrentQuarter(q)
        const due = isDueQuarter(quarters, q)
        const expanded = expandedQuarter === q.label

        return (
          <motion.div
            key={q.label}
            layout
            className="bg-[var(--surface-card)] border rounded-sm p-4 cursor-pointer transition-colors hover:bg-black/[0.05]"
            style={{
              borderColor: current ? 'rgba(22, 163, 74,0.3)' : 'var(--color-border)',
            }}
            onClick={() => handleToggle(q)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {q.label}
                </h3>
                {current && (
                  <span
                    className="text-[9px] font-medium tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
                    style={{ color: '#15803d', backgroundColor: 'rgba(22, 163, 74,0.08)', border: '1px solid rgba(22, 163, 74,0.2)' }}
                  >
                    Current
                  </span>
                )}
                {due && (
                  <span
                    className="text-[9px] font-medium tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
                    style={{ color: '#eab308', backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
                  >
                    Due
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-disabled)' }}>
                  {q.transactionCount} txns
                </span>
                <motion.span
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[12px]"
                  style={{ color: 'var(--color-text-disabled)' }}
                >
                  ▾
                </motion.span>
              </div>
            </div>

            {/* BAS Labels */}
            <div className="border-t border-[var(--color-border)] pt-2">
              <BASLabel label="1A" amountCents={q.label1A_totalSalesCents} />
              <BASLabel label="1B" amountCents={q.label1B_gstOnSalesCents} />
              <BASLabel label="7" amountCents={q.label7_totalPurchasesCents} />
              <BASLabel label="9" amountCents={q.label9_gstOnPurchasesCents} />
              <BASLabel label="11" amountCents={q.label11_gstPayableCents} />
            </div>

            {/* Accountant hand-off export */}
            {exportBusiness !== 'all' && (
              <div className="border-t border-[var(--color-border)] mt-3 pt-3">
                <AccountantPackDownload business={exportBusiness} quarter={q} />
              </div>
            )}

            {/* Expanded transactions */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-t border-[var(--color-border)] mt-3 pt-3">
                    <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-disabled)' }}>
                      Contributing Transactions
                    </p>
                    {transactionsError ? (
                      <p role="alert" className="text-[12px] py-2" style={{ color: '#FCA5A5' }}>
                        Couldn&apos;t load transactions for this quarter — this is a load
                        error, not an empty quarter.
                      </p>
                    ) : (
                      <MiniTransactionTable transactions={quarterTransactions} loading={loadingTransactions} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
      </div>
    </div>
  )
}
