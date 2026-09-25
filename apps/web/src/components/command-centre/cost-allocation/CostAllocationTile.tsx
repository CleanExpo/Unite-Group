'use client'

// src/components/command-centre/cost-allocation/CostAllocationTile.tsx
// Founder cost-allocation tile for the Mission Control deck. A donut of this
// month's cost split across the cost sources (net in the centre), this month
// vs prior month cost as two bars on one scale, and a revenue-vs-cost net
// footer. Reads the metering tables via /api/command-centre/cost-allocation —
// real sums only, honest empty state; an unknown figure is never drawn as $0.

import { useCallback, useEffect, useState } from 'react'
import { SourceBadge, type SourceMode } from '../SourceBadge'
import { CostSplitDonut, MonthOnMonthBars, computeDonutGeometry } from './CostAllocationCharts'

interface SourceView {
  id: string
  name: string
  amount_aud: number
}
type MeteringState = 'collecting' | 'scheduled_noop' | 'dormant'

interface CostAllocationView {
  period: { start: string; end: string }
  sources: SourceView[]
  total_cost_aud: number
  total_revenue_aud: number
  prior_month_cost_aud: number
  /** Absent on a response from before the metering-state field shipped. */
  metering?: { state: MeteringState; fetchers_wired: number }
}

/**
 * What an empty tile actually means. A zero total is only "live" when the
 * pipeline is genuinely collecting; otherwise the cron is a scheduled no-op
 * and saying "live" would present dormancy as active cost collection.
 */
function meteringCopy(state: MeteringState, fetchersWired: number): string {
  if (state === 'dormant') {
    return 'Cost metering is dormant — COST_METERING_ENABLED is not set, so the scheduled cron exits without collecting.'
  }
  if (state === 'scheduled_noop') {
    return `Cost metering is enabled but no provider fetcher is wired (${fetchersWired} registered) — the scheduled cron runs and collects nothing.`
  }
  return 'No cost events recorded for this period yet.'
}

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** A figure the response did not carry (older shape, bad value) reads "unknown", never $0. */
function money(n: unknown): string {
  return typeof n === 'number' && Number.isFinite(n) ? AUD.format(n) : 'unknown'
}

function monthLabel(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function CostAllocationTile() {
  const [data, setData] = useState<CostAllocationView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command-centre/cost-allocation')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // A successful fetch is NOT evidence that anything is collecting. Only a
  // 'collecting' pipeline may badge as live; a dormant or no-op pipeline is
  // 'degraded', which is what the deck already uses for "this is not real".
  const meteringState: MeteringState = data?.metering?.state ?? 'dormant'
  const mode: SourceMode = loading
    ? 'loading'
    : error
      ? 'degraded'
      : meteringState === 'collecting'
        ? 'live'
        : 'degraded'
  const sources = data?.sources ?? []
  const maxAmount = sources.reduce((acc, s) => Math.max(acc, s.amount_aud), 0)
  const empty =
    !loading && !error && data !== null &&
    data.total_cost_aud === 0 && data.total_revenue_aud === 0 && maxAmount === 0
  const revenue = data?.total_revenue_aud
  const cost = data?.total_cost_aud
  const net =
    typeof revenue === 'number' && Number.isFinite(revenue) && typeof cost === 'number' && Number.isFinite(cost)
      ? revenue - cost
      : Number.NaN
  const donut = data && !empty ? computeDonutGeometry(sources, net) : null
  const swatch = new Map(donut?.slices.map((sl) => [sl.id, sl.opacity]) ?? [])

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ color: 'var(--deck-text)', fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Cost allocation{data ? ` — ${monthLabel(data.period.start)}` : ''}
        </h3>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data && !empty && (
            <span style={{ color: 'var(--deck-text)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              {money(data.total_cost_aud)}
            </span>
          )}
          <SourceBadge mode={mode} label="Metering" />
        </span>
      </div>

      {error && <p style={{ color: 'var(--deck-abort-text)', fontSize: 12, margin: 0 }}>{error}</p>}

      {empty && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>
          {meteringCopy(meteringState, data?.metering?.fetchers_wired ?? 0)}
        </p>
      )}

      {!empty && sources.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
          {donut && <CostSplitDonut sources={sources} net={net} />}
          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            {sources.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--deck-line)', fontSize: 12 }}>
                <span
                  aria-hidden="true"
                  style={{
                    flex: 'none',
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: swatch.has(s.id) ? 'var(--deck-amber, #ff8a1f)' : 'transparent',
                    opacity: swatch.get(s.id) ?? 1,
                    border: swatch.has(s.id) ? 'none' : '1px solid var(--deck-line)',
                  }}
                />
                <span style={{ color: 'var(--deck-text)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.name}
                </span>
                <span style={{ color: 'var(--deck-text)', minWidth: 84, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {money(s.amount_aud)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && !empty && <MonthOnMonthBars current={data.total_cost_aud} prior={data.prior_month_cost_aud} />}

      {data && !empty && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          Revenue {money(data.total_revenue_aud)} · Cost {money(data.total_cost_aud)} · Net{' '}
          <span style={{ color: net < 0 ? 'var(--deck-abort-text)' : 'var(--deck-text)' }}>
            {money(net)}
          </span>
          {' '}· Prior month {money(data.prior_month_cost_aud)}
        </p>
      )}
    </section>
  )
}
