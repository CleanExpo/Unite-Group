'use client'
// src/app/(founder)/founder/command-centre/TestCatalogueLiveStrip.tsx
//
// Live half of the test-catalogue tile: the RestoreAssist branch carrying the
// built tests — head commit, CI on that commit, and its PR — polled from
// /api/command-centre/test-catalogue-status every 60s. A failed refresh keeps
// the last reading but marks it stale; it never shows an old green as current.
//
// Read-only. No mutations.

import { useEffect, useState } from 'react'
import type { TestBranchStatus } from '@/lib/command-centre/test-catalogue'
import { StaleReadNotice } from '@/components/ui/StaleReadNotice'

const POLL_MS = 60000

const CI_TONE: Record<TestBranchStatus['ci'], string> = {
  passing: 'var(--tile-green-txt, #34d399)',
  failing: 'var(--tile-red-txt, #d02f35)',
  running: 'var(--tile-amber-txt, #fb923c)',
  none: 'var(--tile-ink-dim, #9bb0c1)',
}

const mono = { fontFamily: 'ui-monospace, SFMono-Regular, monospace' } as const

export function TestCatalogueLiveStrip() {
  const [data, setData] = useState<TestBranchStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/command-centre/test-catalogue-status')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as TestBranchStatus
        if (alive) { setData(json); setError(null) }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'load failed')
      }
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const box = {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.4rem 0.9rem',
    alignItems: 'baseline',
    fontSize: '0.74rem',
    padding: '0.4rem 0.6rem',
    marginBottom: '0.5rem',
    border: '1px solid rgba(155, 176, 193, 0.2)',
    borderRadius: '2px',
    background: 'var(--tile-card-bg, rgba(0,0,0,0.25))',
  }

  if (!data && error) {
    return (
      <p role="alert" data-testid="test-catalogue-live-error" style={{ ...box, color: 'var(--tile-red-txt, #d02f35)' }}>
        Live branch status unavailable: {error}
      </p>
    )
  }
  if (!data) {
    return (
      <p data-testid="test-catalogue-live-loading" style={{ ...box, color: 'var(--tile-ink-dim, #9bb0c1)' }}>
        Checking the test branch on GitHub…
      </p>
    )
  }

  const strip = !data.available ? (
    <p data-testid="test-catalogue-live-unavailable" style={{ ...box, color: 'var(--tile-ink-dim, #9bb0c1)', margin: 0 }}>
      <span>LIVE · {data.status_message}</span>
      {data.read_error && <span style={mono}>{data.read_error}</span>}
      <span style={{ marginLeft: 'auto', ...mono }}>checked {data.checked_at}</span>
    </p>
  ) : (
    <div data-testid="test-catalogue-live" style={box}>
      <span style={{ fontWeight: 700, color: CI_TONE[data.ci] }} data-testid="test-catalogue-live-ci">
        LIVE · CI {data.ci}
        {data.checks_total > 0 && ` (${data.checks_total - data.checks_failed - data.checks_pending}/${data.checks_total} green)`}
      </span>
      <span style={{ color: 'var(--tile-ink-dim, #9bb0c1)' }}>
        {data.repo} · <span style={mono}>{data.branch}</span> @{' '}
        {data.head_url ? (
          <a href={data.head_url} target="_blank" rel="noreferrer" style={mono}>{data.head_sha?.slice(0, 8)}</a>
        ) : (
          <span style={mono}>{data.head_sha?.slice(0, 8)}</span>
        )}
      </span>
      <span style={{ color: 'var(--tile-ink-dim, #9bb0c1)' }} data-testid="test-catalogue-live-pr">
        {data.pr_url ? (
          <a href={data.pr_url} target="_blank" rel="noreferrer">PR #{data.pr_number} · {data.pr_state}</a>
        ) : (
          'no PR yet'
        )}
      </span>
      <span style={{ marginLeft: 'auto', color: 'var(--tile-ink-hush, #6f879b)', ...mono }}>checked {data.checked_at}</span>
    </div>
  )

  return error ? (
    <div data-stale-read="true">
      <p role="alert" style={{ color: 'var(--tile-red-txt, #d02f35)', fontSize: '0.8rem', margin: 0 }}>
        Could not refresh branch status: {error}
      </p>
      <StaleReadNotice source="Test branch status" />
      {strip}
    </div>
  ) : (
    strip
  )
}
