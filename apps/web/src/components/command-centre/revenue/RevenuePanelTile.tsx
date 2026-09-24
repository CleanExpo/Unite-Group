'use client'

// src/components/command-centre/revenue/RevenuePanelTile.tsx
//
// Founder revenue panel (Wave 1). Cleared Stripe funds this week (Mon–Sun,
// Australia/Sydney) against break-even and the margin target, MRR by business,
// the last 10 cleared payments and a 7-day trend. Reads its own data from
// /api/command-centre/revenue — no key ever reaches this component.
//
// Honesty rules the view enforces:
//   - an account that could not be read is "NOT CONNECTED" in red with the
//     reason class — never $0, never an empty list;
//   - an account read OK with nothing cleared says "$0 — read OK at <time>";
//   - the combined total is labelled PARTIAL unless both accounts read OK.

import { useEffect, useState } from 'react'
import type { RevenueResponse } from '@/lib/revenue/revenue-snapshot'
import type { AccountRead } from '@/lib/revenue/stripe-account'

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export function formatCents(cents: number): string {
  return aud.format(cents / 100)
}

function sydneyTime(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

const REASON_TEXT: Record<string, string> = {
  missing_key: 'key not set in this environment',
  auth_failed: 'Stripe rejected the key (401)',
  permission_denied: 'key lacks a read permission (403)',
  rate_limited: 'Stripe rate limit (429)',
  network_error: 'network error reaching Stripe',
  upstream_error: 'Stripe returned an error',
}

const card: React.CSSProperties = {
  border: '1px solid var(--deck-line)',
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: 12,
  color: 'var(--deck-text)',
}
const muted: React.CSSProperties = { color: 'var(--deck-muted)', fontSize: 11 }
const red: React.CSSProperties = { color: 'var(--deck-abort-text, #dc2626)', fontWeight: 700 }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8 }

function Trend({ trend }: { trend: { date: string; netCents: number }[] }) {
  const max = Math.max(1, ...trend.map((d) => d.netCents))
  return (
    <div aria-label="7-day cleared trend" style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
      {trend.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${formatCents(d.netCents)}`}
          style={{
            flex: 1,
            height: `${Math.max(2, Math.round((Math.max(0, d.netCents) / max) * 40))}px`,
            background: 'var(--deck-cyan, #0891b2)',
            opacity: d.netCents > 0 ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  )
}

function AccountSection({ account }: { account: AccountRead }) {
  if (account.status === 'not_connected') {
    return (
      <div data-testid={`revenue-account-${account.account}`} style={card}>
        <strong>{account.label}</strong>
        <span data-testid={`revenue-not-connected-${account.account}`} style={red}>
          NOT CONNECTED — {REASON_TEXT[account.reason] ?? account.reason}
        </span>
        <span style={muted}>Checked {sydneyTime(account.readAt)}. No figures shown for this account.</span>
      </div>
    )
  }

  const { cleared, mrr } = account
  return (
    <div data-testid={`revenue-account-${account.account}`} style={card}>
      <div style={row}>
        <strong>{account.label}</strong>
        <span data-testid={`revenue-week-${account.account}`}>
          {cleared.weekCount === 0
            ? `$0 — read OK at ${sydneyTime(account.readAt)}`
            : `${formatCents(cleared.weekNetCents)} this week`}
        </span>
      </div>
      {account.truncated && <span style={red}>Read hit a page cap — totals may be incomplete.</span>}
      {cleared.nonAudExcludedCount > 0 && (
        <span style={muted}>{cleared.nonAudExcludedCount} non-AUD cleared payment(s) excluded from totals.</span>
      )}

      {cleared.byBusiness.length > 0 && (
        <div>
          {cleared.byBusiness.map((b) => (
            <div key={b.business} style={row} data-testid={`revenue-business-${b.business}`}>
              <span>{b.label}</span>
              <span>
                {formatCents(b.weekNetCents)} · {b.weekCount} payment{b.weekCount === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <span style={muted}>MRR (active subscriptions) · {formatCents(mrr.totalCents)}</span>
        {mrr.rows.map((r) => (
          <div key={r.business} style={row}>
            <span>{r.label}</span>
            <span>
              {formatCents(r.mrrCents)}/mo · {r.subscriptions} sub{r.subscriptions === 1 ? '' : 's'}
            </span>
          </div>
        ))}
        {mrr.rows.length === 0 && <span style={muted}> · no active subscriptions (read OK)</span>}
      </div>

      <div>
        <span style={muted}>7-day cleared trend</span>
        <Trend trend={cleared.trend} />
      </div>

      <div>
        <span style={muted}>Last {cleared.lastPayments.length} cleared payments</span>
        {cleared.lastPayments.length === 0 && <div style={muted}>None in the lookback window (read OK).</div>}
        {cleared.lastPayments.map((p, i) => (
          <div key={`${p.availableAt}-${i}`} style={row}>
            <span>
              {sydneyTime(p.availableAt)} · {p.label}
            </span>
            <span>{formatCents(p.netCents)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const VERDICT_TEXT: Record<string, string> = {
  below_break_even: 'Below break-even',
  break_even_met: 'Break-even met',
  margin_target_met: 'Margin target met',
  partial: 'PARTIAL — not every account could be read',
}

export function RevenuePanelView({ data }: { data: RevenueResponse }) {
  const { combined, week } = data
  return (
    <section data-testid="revenue-panel" aria-label="Cleared revenue" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={card}>
        <div style={row}>
          <strong>Cleared funds · week {week.startDate} to {week.endDate} (Sydney)</strong>
          <span data-testid="revenue-verdict" style={combined.complete ? undefined : red}>
            {VERDICT_TEXT[combined.verdict]}
          </span>
        </div>
        <div data-testid="revenue-combined" style={{ fontSize: 20, fontWeight: 700 }}>
          {combined.complete ? '' : 'at least '}
          {formatCents(combined.weekNetCents)}
        </div>
        <div style={muted}>
          Break-even {formatCents(combined.breakEvenCents)}
          {combined.complete && combined.gapToBreakEvenCents > 0 ? ` (short ${formatCents(combined.gapToBreakEvenCents)})` : ''} ·
          margin target {formatCents(combined.marginTargetCents)}
          {combined.complete && combined.gapToMarginCents > 0 ? ` (short ${formatCents(combined.gapToMarginCents)})` : ''}
        </div>
        <div style={muted}>{data.definition} Read {sydneyTime(data.cachedAt)}.</div>
      </div>
      {data.accounts.map((a) => (
        <AccountSection key={a.account} account={a} />
      ))}
    </section>
  )
}

export function RevenuePanelTile() {
  const [data, setData] = useState<RevenueResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/command-centre/revenue', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`revenue_http_${res.status}`)
        return (await res.json()) as RevenueResponse
      })
      .then((body) => {
        if (!cancelled) setData(body)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'revenue_fetch_failed')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <section data-testid="revenue-panel" aria-label="Cleared revenue" style={card}>
        <strong>Cleared revenue</strong>
        <span style={red}>NOT CONNECTED — revenue route failed ({error})</span>
      </section>
    )
  }
  if (!data) {
    return (
      <section data-testid="revenue-panel" aria-label="Cleared revenue" style={card}>
        <span style={muted}>Reading Stripe…</span>
      </section>
    )
  }
  return <RevenuePanelView data={data} />
}
