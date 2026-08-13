// src/components/founder/dashboard/KPICard.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { type Business } from '@/lib/businesses'
import { type XeroRevenueMTD } from '@/lib/integrations/xero'
import type { BatchKPIEntry } from '@/app/api/dashboard/kpi/route'

interface KPICardProps {
  business: Business
  metric: string
  metricLabel: string
  trend: { value: string; positive: boolean }
  secondary: string
  xeroBusinessKey?: string
  linearBusinessKey?: string
  /** Pre-fetched data from batch endpoint — skips individual fetches when provided */
  liveData?: BatchKPIEntry
}

function formatAUD(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

interface LiveState {
  metric: string | null
  trend: { value: string; positive: boolean } | null
  secondary: string | null
  source: 'xero' | 'mock' | null
  loading: boolean
  /** True only when the revenue fetch THREW (integration error), as opposed to
   *  an expected "not connected / no data" degrade. Drives the honest error
   *  affordance so a hard failure never sits on a permanent "Loading…". */
  error: boolean
}

export function KPICard({
  business,
  metric,
  metricLabel,
  trend,
  secondary,
  xeroBusinessKey,
  linearBusinessKey,
  liveData,
}: KPICardProps) {
  const [live, setLive] = useState<LiveState>({
    metric: null, trend: null, secondary: null, source: null, loading: false, error: false,
  })
  const [linearCount, setLinearCount] = useState<number | null>(null)
  /** True when the issue count was NOT read — unconfigured Linear, or a read
   *  that threw. Distinct from `linearCount === 0`, which is a real zero from a
   *  read that succeeded. [UNI-2485] */
  const [linearUnavailable, setLinearUnavailable] = useState(false)

  // When batch liveData is provided, populate state directly — no individual fetch needed
  useEffect(() => {
    if (liveData) {
      if (liveData.xeroDegraded) {
        // The batch read for THIS business rejected. Take the same honest
        // affordance the individual fetch's catch takes — "Error" badge and
        // "Couldn't load", never placeholders beside "Demo", which reads as
        // "not connected" rather than "we could not read it".
        setLive({ metric: null, trend: null, secondary: null, source: null, loading: false, error: true })
      } else if (liveData.revenueCents !== undefined) {
        setLive({
          metric: formatAUD(liveData.revenueCents),
          trend: {
            value: `${(liveData.growth ?? 0) >= 0 ? '+' : ''}${(liveData.growth ?? 0).toFixed(1)}% MoM`,
            positive: (liveData.growth ?? 0) >= 0,
          },
          secondary: `${liveData.invoiceCount ?? 0} Invoices MTD`,
          source: liveData.source ?? null,
          loading: false,
          error: false,
        })
      }
      if (liveData.activeIssues !== undefined) {
        setLinearCount(liveData.activeIssues)
      }
    }
  }, [liveData])

  // Fallback: individual Xero fetch when no batch data provided
  useEffect(() => {
    if (liveData) return // Batch data takes precedence
    if (xeroBusinessKey) {
      setLive(prev => ({ ...prev, loading: true, error: false }))
      fetch(`/api/xero/revenue?business=${encodeURIComponent(xeroBusinessKey)}`)
        .then(res => {
          // A non-OK status is a FAILED read, not "Xero not connected".
          // Mapping it to null sent it into the degrade branch below — which is
          // documented as an expected state and sets `error: false` — so a 500
          // rendered with the Demo badge and a "Loading…" secondary. Throwing
          // hands it to the catch, which already surfaces it honestly.
          //
          // The Linear fallback directly below carries this same guard. This
          // sibling was missed when that one was added. [UNI-2492]
          if (!res.ok) throw new Error(`/api/xero/revenue returned ${res.status}`)
          return res.json() as Promise<{ data?: XeroRevenueMTD; source?: 'xero' | 'mock' } | null>
        })
        .then((payload) => {
          const data = payload?.data
          // Xero not connected / no data — an expected degraded state, not an error.
          if (!data || data.revenueCents == null) {
            setLive({ metric: null, trend: null, secondary: null, source: payload?.source ?? null, loading: false, error: false })
            return
          }
          setLive({
            metric: formatAUD(data.revenueCents),
            trend: {
              value: `${data.growth >= 0 ? '+' : ''}${data.growth.toFixed(1)}% MoM`,
              positive: data.growth >= 0,
            },
            secondary: `${data.invoiceCount} Invoices MTD`,
            source: payload?.source ?? null,
            loading: false,
            error: false,
          })
        })
        .catch((error) => {
          // Integration fetch threw — surface honestly, never fabricate "Loading…".
          console.error(`[kpi] Xero revenue fetch failed for ${xeroBusinessKey}:`, error)
          setLive({ metric: null, trend: null, secondary: null, source: null, loading: false, error: true })
        })
    }
  }, [xeroBusinessKey, liveData])

  // Fallback: individual Linear fetch when no batch data provided
  useEffect(() => {
    if (liveData) return // Batch data takes precedence
    if (!linearBusinessKey) return
    setLinearUnavailable(false)
    fetch(`/api/linear/kpi?business=${encodeURIComponent(linearBusinessKey)}`)
      .then(async (res) => {
        // The status carries the verdict for a thrown read, and this path used
        // to parse the body regardless — so a 500 yielded `activeCount:
        // undefined` and set the count to it.
        if (!res.ok) throw new Error(`/api/linear/kpi returned ${res.status}`)
        return res.json() as Promise<{ activeCount?: number; configured?: boolean }>
      })
      .then((body) => {
        // `activeCount` is ABSENT whenever the count was not read. Defaulting
        // it to 0 here would reinstate the false zero the route just stopped
        // sending, so the count stays unknown and the card says so. [UNI-2485]
        if (typeof body.activeCount === 'number') {
          setLinearCount(body.activeCount)
          return
        }
        setLinearUnavailable(true)
      })
      .catch(() => { setLinearUnavailable(true) })
  }, [linearBusinessKey, liveData])

  const isLive = !!xeroBusinessKey

  // Fall back to static props when live data hasn't loaded
  const displayMetric = live.metric ?? metric
  const displayTrend = live.trend ?? trend
  const displaySecondary = live.error
    ? "Couldn’t load — refresh to retry"
    : linearCount !== null
      ? `${linearCount} active issue${linearCount !== 1 ? 's' : ''}`
      : linearUnavailable
        ? 'Issue count unavailable'
        : (live.secondary ?? secondary)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative rounded-sm border p-5 flex flex-col gap-3"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Business header */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-sm shrink-0"
          style={{ width: 8, height: 8, background: business.color }}
        />
        <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{business.name}</span>
        {/* Live / Demo / error badge */}
        {isLive && (
          <span className="ml-auto flex items-center gap-1">
            {live.loading ? (
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
            ) : live.error ? (
              // Don't show "Demo" on a failed fetch — that would imply demo data is shown.
              <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'var(--color-danger)' }}>
                Error
              </span>
            ) : live.source === 'xero' ? (
              <>
                <span
                  className="rounded-sm shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    background: '#16a34a',
                    boxShadow: '0 0 4px #16a34a',
                  }}
                />
                <span className="text-[10px] font-medium tracking-widest uppercase text-[#15803d]">
                  Live
                </span>
              </>
            ) : (
              <>
                <span
                  className="rounded-sm shrink-0"
                  style={{ width: 6, height: 6, background: '#555' }}
                />
                <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'var(--color-text-disabled)' }}>
                  Demo
                </span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Primary metric */}
      <div>
        <div className="text-[30px] font-semibold text-[#0A0A0A] leading-none tracking-tight">
          {live.loading ? (
            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          ) : (
            displayMetric
          )}
        </div>
        <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{metricLabel}</div>
      </div>

      {/* Trend */}
      <div
        className="text-[12px] font-medium"
        style={{
          color: displayTrend.positive ? 'var(--color-success)' : 'var(--color-danger)',
        }}
      >
        {displayTrend.positive ? '▲' : '▼'} {displayTrend.value}
      </div>

      {/* Divider + secondary */}
      <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <span
          className="text-[11px]"
          style={{ color: live.error ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
          role={live.error ? 'alert' : undefined}
        >
          {displaySecondary}
        </span>
      </div>

    </motion.div>
  )
}
