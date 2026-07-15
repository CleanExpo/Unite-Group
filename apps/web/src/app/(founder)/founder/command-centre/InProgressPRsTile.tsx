'use client'

// src/app/(founder)/founder/command-centre/InProgressPRsTile.tsx
//
// Lane 16.5 — CRM Command-Centre tile: In-Progress PRs.
//
// Client component (UNI-2340 fast-follow): fetches /api/command-centre/in-progress-prs
// on mount + 60s poll, mirroring the sibling GitHub tiles (RepoCampaignsTile,
// TeamActivityTile, PortfolioHealthTile) instead of blocking the command deck's
// SSR with ~9 parallel GitHub calls (previously awaited server-side in page.tsx —
// a GitHub degradation pinned the whole deck's TTFB near 8s). Renders honestly
// when GitHub is not connected, some repos fail, the fetch itself fails, or
// there are genuinely no open PRs.
//
// Read-only. No mutations.

import { useEffect, useState } from 'react'
import type { InProgressPR, InProgressPRsResult } from '@/lib/command-centre/in-progress-prs'

const POLL_MS = 60000

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.round(hr / 24)
  return `${d}d`
}

export function InProgressPRsTile() {
  const [data, setData] = useState<InProgressPRsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/command-centre/in-progress-prs')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as InProgressPRsResult
        if (alive) { setData(json); setError(null) }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'load failed')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => { alive = false; clearInterval(t) }
  }, [])

  // Loading (no data yet) and fetch-failure (this route itself unreachable) are
  // distinct from a GitHub-unavailable payload (data.available === false, which
  // the route can return with a 200 — see the empty-state branch below).
  if (loading && !data) {
    return (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
        Loading in-progress PRs…
      </p>
    )
  }

  if (error && !data) {
    return (
      <p data-testid="in-progress-prs-tile-error" style={{ color: 'var(--tile-red-txt, #d02f35)', fontSize: '0.85rem', margin: 0 }}>
        Could not load in-progress PRs: {error}
      </p>
    )
  }

  if (!data) {
    // Unreachable in practice (loading/error above cover the only paths that
    // leave data null), but keeps the component total for TypeScript.
    return null
  }

  if (data.entries.length === 0) {
    // Either GitHub is not connected, some repos failed, or there are genuinely
    // no open PRs. Green only when the sweep was clean — a partial failure must
    // never render as an all-clear (NorthStar honesty).
    const unavailable = !data.available
    const partial = data.available && data.read_error !== null
    const tone = unavailable || partial ? 'var(--color-text-muted)' : 'var(--tile-green-txt, #34d399)'
    return (
      <p
        data-testid="in-progress-prs-tile-empty"
        style={{ color: tone, fontSize: '0.85rem', margin: 0 }}
      >
        {data.status_message}
        {data.read_error ? ` — ${data.read_error}` : ''}
      </p>
    )
  }

  return (
    <div data-testid="in-progress-prs-tile">
      <div
        style={{
          color: 'var(--tile-ink-hush, #6f879b)',
          fontSize: '0.72rem',
          marginBottom: '0.4rem',
        }}
      >
        {data.status_message}
      </div>
      {data.read_error && (
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginBottom: '0.4rem' }}>
          ⚠ {data.read_error}
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.3rem' }}>
        {data.entries.map((pr: InProgressPR) => (
          <li
            key={`${pr.repo}#${pr.number}`}
            data-pr-number={pr.number}
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'baseline',
              padding: '0.3rem 0.5rem',
              border: '1px solid rgba(56, 225, 255, 0.18)',
              borderLeft: '3px solid #16a34a',
              background: 'var(--tile-card-bg, rgba(0,0,0,0.25))',
              borderRadius: '2px',
              fontSize: '0.78rem',
            }}
          >
            <span
              style={{
                color: 'var(--tile-ink-hush, #6f879b)',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                minWidth: '3rem',
              }}
            >
              #{pr.number}
            </span>
            <a
              href={pr.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--tile-ink, #e6f7ff)', textDecoration: 'none' }}
            >
              {pr.title}
            </a>
            <span style={{ color: 'var(--tile-ink-dim, #9bb0c1)' }}>· @{pr.author}</span>
            <span style={{ color: 'var(--tile-ink-dim, #9bb0c1)' }}>· {pr.head_ref}</span>
            <span
              style={{
                marginLeft: 'auto',
                color: 'var(--tile-ink-hush, #6f879b)',
                fontSize: '0.7rem',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {fmtRelative(pr.created_at)} ago · {pr.repo}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
