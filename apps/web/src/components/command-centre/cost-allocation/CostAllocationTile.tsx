'use client'

// src/components/command-centre/cost-allocation/CostAllocationTile.tsx
// Founder cost-allocation tile for the Mission Control deck. One horizontal
// bar per cost source (share of the max spender), current-calendar-month
// totals, and a revenue-vs-cost net footer. Reads the metering tables via
// /api/command-centre/cost-allocation — real sums only, honest empty state.

import { useCallback, useEffect, useState } from 'react'
import { SourceBadge, type SourceMode } from '../SourceBadge'

interface SourceView {
  id: string
  name: string
  amount_aud: number
}
interface CostAllocationView {
  period: { start: string; end: string }
  sources: SourceView[]
  total_cost_aud: number
  total_revenue_aud: number
  prior_month_cost_aud: number
}

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

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

  const mode: SourceMode = loading ? 'loading' : error ? 'degraded' : 'live'
  const sources = data?.sources ?? []
  const maxAmount = sources.reduce((acc, s) => Math.max(acc, s.amount_aud), 0)
  const empty =
    !loading && !error && data !== null &&
    data.total_cost_aud === 0 && data.total_revenue_aud === 0 && maxAmount === 0
  const net = (data?.total_revenue_aud ?? 0) - (data?.total_cost_aud ?? 0)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ color: 'var(--deck-text)', fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Cost allocation{data ? ` — ${monthLabel(data.period.start)}` : ''}
        </h3>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data && !empty && (
            <span style={{ color: 'var(--deck-text)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              {AUD.format(data.total_cost_aud)}
            </span>
          )}
          <SourceBadge mode={mode} label="Metering" />
        </span>
      </div>

      {error && <p style={{ color: 'var(--deck-abort-text)', fontSize: 12, margin: 0 }}>{error}</p>}

      {empty && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>
          No cost events ingested yet — cost-ingest cron pending first run.
        </p>
      )}

      {!empty && sources.length > 0 && (
        <div>
          {sources.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--deck-line)', fontSize: 12 }}>
              <span style={{ color: 'var(--deck-text)', minWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.name}
              </span>
              <span style={{ flex: 1, height: 6, borderRadius: 2, background: 'transparent', overflow: 'hidden' }}>
                <span
                  data-testid={`cost-bar-${s.id}`}
                  style={{
                    display: 'block',
                    height: '100%',
                    width: maxAmount > 0 ? `${Math.max(1, (s.amount_aud / maxAmount) * 100)}%` : '0%',
                    background: 'var(--deck-muted)',
                    borderRadius: 2,
                  }}
                />
              </span>
              <span style={{ color: 'var(--deck-text)', minWidth: 84, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {AUD.format(s.amount_aud)}
              </span>
            </div>
          ))}
        </div>
      )}

      {data && !empty && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          Revenue {AUD.format(data.total_revenue_aud)} · Cost {AUD.format(data.total_cost_aud)} · Net{' '}
          <span style={{ color: net < 0 ? 'var(--deck-abort-text)' : 'var(--deck-text)' }}>
            {AUD.format(net)}
          </span>
          {' '}· Prior month {AUD.format(data.prior_month_cost_aud)}
        </p>
      )}
    </section>
  )
}
