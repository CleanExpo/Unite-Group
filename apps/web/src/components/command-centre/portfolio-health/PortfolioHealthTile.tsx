'use client'

// src/components/command-centre/portfolio-health/PortfolioHealthTile.tsx
//
// UNI-2201 — Portfolio Health tile. Founder command-deck view of live CI health
// across the RestoreAssist / Synthex / Nexus repos plus the portfolio-wide open
// P0/P1 count, each shown as a red/yellow/green badge. Reads its own data from
// /api/command-centre/portfolio-health (no secrets ever reach this component)
// and refreshes every 60s per the ticket acceptance.

import { useEffect, useState } from 'react'
import { SourceBadge, type SourceMode } from '../SourceBadge'
import { DegradedDataBanner } from '../DegradedDataBanner'

type HealthColor = 'green' | 'yellow' | 'red' | 'grey'

interface RepoHealth {
  repo: string
  fullName: string
  latestConclusion: string
  failCountLast10: number
  latestRunAt: string | null
  latestRunUrl: string | null
  color: HealthColor
  error?: string
}

interface PortfolioHealthResponse {
  configured: boolean
  source: string
  repos: RepoHealth[]
  overall: HealthColor
  openP0P1: number | null
  linearSource: string
  timestamp: string
  error?: string
}

const REFRESH_MS = 60_000

const DOT: Record<HealthColor, string> = {
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
  grey: '#6f879b',
}

function formatRunAt(iso: string | null): string {
  if (!iso) return 'no runs'
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return 'unknown'
  return `${new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(parsed))} AEST`
}

function sourceMode(loading: boolean, data: PortfolioHealthResponse | null, fetchError: string | null): SourceMode {
  if (loading && !data) return 'loading'
  if (fetchError || !data || !data.configured) return 'degraded'
  if (data.source === 'error') return 'degraded'
  return 'live'
}

export function PortfolioHealthTile() {
  const [data, setData] = useState<PortfolioHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/command-centre/portfolio-health', { cache: 'no-store' })
        if (!res.ok) throw new Error(`portfolio_health_http_${res.status}`)
        const body = (await res.json()) as PortfolioHealthResponse
        if (cancelled) return
        setData(body)
        setFetchError(null)
      } catch (err) {
        if (cancelled) return
        setFetchError(err instanceof Error ? err.message : 'portfolio_health_fetch_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const configured = data?.configured ?? false
  const repos = data?.repos ?? []
  const mode = sourceMode(loading, data, fetchError)
  const degradedReason = fetchError ?? (data && data.source === 'partial' ? 'some repos could not be read' : null)
  const p0p1Label =
    data?.linearSource === 'linear_live' ? `${data.openP0P1} P0/P1 open` : 'P0/P1 n/a'
  const headerLabel = configured
    ? `${repos.length} repos · ${p0p1Label}`
    : 'not configured'

  return (
    <section
      data-testid="portfolio-health-tile"
      aria-label="Portfolio Health"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text)', fontSize: 14, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {data?.configured && (
            <span
              aria-hidden
              data-testid="portfolio-overall-dot"
              style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: DOT[data.overall] }}
            />
          )}
          Portfolio Health
        </h3>
        <SourceBadge mode={mode} label={headerLabel} lastUpdatedAt={data?.timestamp} />
      </div>

      {!loading && !configured && !fetchError && (
        <p style={{ color: 'rgba(207,224,236,0.45)', fontSize: 12, margin: 0 }}>
          Portfolio health not configured — GITHUB_TOKEN missing in this environment.
        </p>
      )}

      {degradedReason && <DegradedDataBanner source="Portfolio Health" reason={degradedReason} />}

      {configured && repos.length > 0 && (
        <div>
          {repos.map((r) => (
            <div
              key={r.fullName}
              data-testid={`portfolio-repo-${r.repo}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: '1px solid var(--deck-line)',
                fontSize: 12,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--deck-text)' }}>
                <span
                  aria-hidden
                  data-testid={`portfolio-badge-${r.repo}`}
                  data-color={r.color}
                  style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: DOT[r.color] }}
                />
                {r.repo}
                <span style={{ color: 'rgba(207,224,236,0.45)' }}>
                  {r.error ? '· unreadable' : `· ${r.latestConclusion}`}
                  {!r.error && r.failCountLast10 > 0 && ` · ${r.failCountLast10}/10 fails`}
                </span>
              </span>
              <span style={{ color: 'rgba(207,224,236,0.45)' }}>{formatRunAt(r.latestRunAt)}</span>
            </div>
          ))}
        </div>
      )}

      {configured && repos.length === 0 && !loading && !degradedReason && (
        <p style={{ color: 'rgba(207,224,236,0.45)', fontSize: 12, margin: 0 }}>No repos reporting yet.</p>
      )}
    </section>
  )
}
