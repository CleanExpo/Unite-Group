'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { Tables } from '@/types/database'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

type Opportunity = Tables<'crm_opportunities'>

interface Summary {
  total: number
  open: number
  won: number
  lost: number
  openValue: number
  weightedPipeline: number
}

interface SourceOfTruth {
  crm: string
  billing: string
  mode: 'forecast_only'
}

interface Readiness {
  queueWindow: 'latest_500_created_at'
  pagination: 'cursor_by_created_at'
  latestOpportunityUpdatedAt?: string | null
  nextCursor?: string | null
}

const STAGE_OPTIONS = [
  'all', 'new_signal', 'qualified', 'discovery', 'proposal_needed', 'proposal_sent',
  'negotiation', 'decision_needed', 'won_pending_client_conversion', 'won_converted',
  'lost', 'paused', 'blocked_review',
] as const

function aud(value: number): string {
  return `$${Math.round(value).toLocaleString('en-AU')}`
}

const REDACTED = '[REDACTED]'

function redactOpportunityText(value: string): string {
  return value
    .replace(/\b(https?:\/\/)[^\s/?#@]+@/gi, `$1${REDACTED}@`)
    .replace(/\b[A-Z0-9_-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API[_-]?KEY|SERVICE[_-]?ROLE[_-]?KEY)[A-Z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s;,]+)/gi, REDACTED)
    .replace(/\b(Bearer\s+)[A-Z0-9_-]+(?:\.[A-Z0-9_-]+){2,}\b/gi, `$1${REDACTED}`)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED)
    .replace(/\bBOARD-[A-Z0-9-]{3,}\b/gi, REDACTED)
    .replace(/(?:\+61|\b0\d)[\d\s().-]{7,}\d\b/g, REDACTED)
    .replace(/\bcard\s+(?:ending|ending\s+in|ends\s+in)\s+\d{3,4}\b/gi, REDACTED)
}

function label(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatSourceTimestamp(iso: string): string | null {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return null
  return `${new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(parsed))} AEST`
}

function newestTimestamp(current?: string | null, incoming?: string | null): string | null {
  const currentTime = current ? Date.parse(current) : Number.NaN
  const incomingTime = incoming ? Date.parse(incoming) : Number.NaN
  if (Number.isNaN(currentTime)) return Number.isNaN(incomingTime) ? null : incoming ?? null
  if (Number.isNaN(incomingTime)) return current ?? null
  return incomingTime > currentTime ? incoming ?? null : current ?? null
}

function mergeReadiness(current: Readiness | null, incoming: Readiness | null): Readiness | null {
  if (!incoming) return current
  if (!current) return incoming
  return {
    ...incoming,
    latestOpportunityUpdatedAt: newestTimestamp(
      current.latestOpportunityUpdatedAt,
      incoming.latestOpportunityUpdatedAt,
    ),
  }
}

function mergeOpportunityRows(current: Opportunity[], incoming: Opportunity[]): Opportunity[] {
  const seen = new Set(current.map((opportunity) => opportunity.id))
  const uniqueIncoming = incoming.filter((opportunity) => {
    if (seen.has(opportunity.id)) return false
    seen.add(opportunity.id)
    return true
  })
  return [...current, ...uniqueIncoming]
}

function summarizeOpportunities(rows: Opportunity[]): Summary {
  const open = rows.filter((opportunity) => opportunity.status === 'open')
  return {
    total: rows.length,
    open: open.length,
    won: rows.filter((opportunity) => opportunity.status === 'won').length,
    lost: rows.filter((opportunity) => opportunity.status === 'lost').length,
    openValue: open.reduce((sum, opportunity) => sum + Number(opportunity.value_amount ?? 0), 0),
    weightedPipeline: open.reduce(
      (sum, opportunity) => sum + Number(opportunity.value_amount ?? 0) * ((opportunity.probability ?? 0) / 100),
      0,
    ),
  }
}

export function OpportunitiesPageClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [sourceOfTruth, setSourceOfTruth] = useState<SourceOfTruth | null>(null)
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState(false)
  const [olderError, setOlderError] = useState(false)
  const [stageFilter, setStageFilter] = useState<string>('all')

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/founder/opportunities', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to load opportunities')
      const data = await res.json()
      setOpportunities(data.opportunities ?? [])
      setSummary(data.summary ?? null)
      setSourceOfTruth(data.sourceOfTruth ?? null)
      setReadiness(data.readiness ?? null)
      setError(false)
      setOlderError(false)
    } catch {
      // Honest hard-error state — never fabricate an empty pipeline (No-Invaders #1).
      setError(true)
      setOlderError(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOlderOpportunities = useCallback(async () => {
    const before = readiness?.nextCursor
    if (!before) return

    setLoadingOlder(true)
    try {
      const res = await fetch(`/api/founder/opportunities?before=${encodeURIComponent(before)}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to load older opportunities')
      const data = await res.json()
      setOpportunities((current) => {
        const merged = mergeOpportunityRows(current, data.opportunities ?? [])
        setSummary(summarizeOpportunities(merged))
        return merged
      })
      setReadiness((current) => mergeReadiness(current, data.readiness ?? null))
      setOlderError(false)
      setError(false)
    } catch {
      setOlderError(true)
    } finally {
      setLoadingOlder(false)
    }
  }, [readiness?.nextCursor])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const filtered = useMemo(() => {
    if (stageFilter === 'all') return opportunities
    return opportunities.filter((o) => o.stage === stageFilter)
  }, [opportunities, stageFilter])

  const latestOpportunityUpdateLabel = readiness?.latestOpportunityUpdatedAt
    ? formatSourceTimestamp(readiness.latestOpportunityUpdatedAt)
    : null

  const loadedCountLabel = useMemo(() => {
    if (loading) return null
    const loadedLabel = `${opportunities.length} loaded ${opportunities.length === 1 ? 'opportunity' : 'opportunities'}`
    const base = stageFilter === 'all'
      ? `Showing ${loadedLabel}`
      : `Showing ${filtered.length} of ${loadedLabel} for ${label(stageFilter)}`
    return readiness?.nextCursor ? `${base} · older opportunities available` : base
  }, [filtered.length, loading, opportunities.length, readiness?.nextCursor, stageFilter])

  const kpis = [
    { key: 'open', label: 'Open', value: String(summary?.open ?? 0) },
    { key: 'weighted', label: 'Weighted pipeline', value: aud(summary?.weightedPipeline ?? 0) },
    { key: 'openval', label: 'Open value', value: aud(summary?.openValue ?? 0) },
    { key: 'won', label: 'Won', value: String(summary?.won ?? 0) },
  ]

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Revenue opportunities"
        subtitle="Forecast-only pipeline across the portfolio — not billing truth."
      />

      {error ? (
        <div
          className="rounded-sm px-4 py-3 text-[13px]"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          The opportunity pipeline failed to load.{' '}
          <button onClick={fetchOpportunities} className="underline" style={{ color: 'var(--color-text-primary)' }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {sourceOfTruth && (
            <div
              className="rounded-sm px-4 py-3 flex flex-col gap-1 text-[12px]"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              <span>CRM source: {sourceOfTruth.crm}</span>
              <span>{sourceOfTruth.mode === 'forecast_only' ? 'Forecast only' : sourceOfTruth.mode} · Billing truth stays in Stripe</span>
              {readiness && (
                <span>Queue window: latest 500 by created date · Cursor pagination available for older opportunities</span>
              )}
              {latestOpportunityUpdateLabel && (
                <span>Latest opportunity update: {latestOpportunityUpdateLabel}</span>
              )}
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div
                key={k.key}
                className="rounded-sm px-4 py-3 flex flex-col gap-1"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
              >
                <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {k.label}
                </span>
                <span className="text-lg font-light" style={{ color: 'var(--color-text-primary)' }}>
                  {loading ? '—' : k.value}
                </span>
              </div>
            ))}
          </div>

          {/* Stage filter */}
          <div className="flex flex-col gap-2">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              aria-label="Filter by stage"
              className="text-[12px] rounded-sm px-3 py-2 max-w-xs"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All stages' : label(s)}</option>
              ))}
            </select>
            {loadedCountLabel && (
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {loadedCountLabel}
              </p>
            )}
            {olderError && (
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                Older opportunities failed to load. Current page is still visible.
              </p>
            )}
          </div>

          {/* List */}
          {!loading && filtered.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title={opportunities.length === 0 ? 'No opportunities yet' : 'No opportunities in this stage'}
              description={
                opportunities.length === 0
                  ? 'Revenue opportunities will appear here as leads are qualified into the pipeline.'
                  : 'Try a different stage filter.'
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((o) => (
                <div
                  key={o.id}
                  className="rounded-sm px-4 py-3 flex items-center gap-4"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {redactOpportunityText(o.name)}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {label(o.stage)} · {o.status}
                      {o.next_action ? ` · next: ${redactOpportunityText(o.next_action)}` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
                      {o.value_amount != null ? aud(Number(o.value_amount)) : '—'}
                    </span>
                    {o.probability != null && (
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {o.probability}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {readiness?.nextCursor && (
                <button
                  type="button"
                  onClick={fetchOlderOpportunities}
                  disabled={loadingOlder}
                  className="rounded-sm px-4 py-3 text-[12px] text-left"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  {loadingOlder ? 'Loading older opportunities…' : 'Load older opportunities'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
