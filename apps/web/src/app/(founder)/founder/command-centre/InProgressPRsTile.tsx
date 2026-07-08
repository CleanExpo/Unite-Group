// src/app/(founder)/founder/command-centre/InProgressPRsTile.tsx
//
// Lane 16.5 — CRM Command-Centre tile: In-Progress PRs.
//
// Server component. Renders the most recent open PRs across all portfolio
// repos (UNI-2340: GitHub REST API — serverless-safe; previously a local-only
// gh-CLI view that was permanently empty in production). Renders honestly
// when GitHub is not connected or there are genuinely no open PRs.
//
// Read-only. No mutations, no network calls beyond the lib helper.

import type { InProgressPR, InProgressPRsResult } from '@/lib/command-centre/in-progress-prs'

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

export function InProgressPRsTile({ data }: { data: InProgressPRsResult }) {
  if (data.entries.length === 0) {
    // Either GitHub is not connected, some repos failed, or there are genuinely
    // no open PRs. Green only when the sweep was clean — a partial failure must
    // never render as an all-clear (NorthStar honesty).
    const unavailable = !data.available
    const partial = data.available && data.read_error !== null
    const tone = unavailable || partial ? 'var(--color-text-muted)' : '#34d399'
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
          color: '#6f879b',
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
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '2px',
              fontSize: '0.78rem',
            }}
          >
            <span
              style={{
                color: '#6f879b',
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
              style={{ color: '#e6f7ff', textDecoration: 'none' }}
            >
              {pr.title}
            </a>
            <span style={{ color: '#9bb0c1' }}>· @{pr.author}</span>
            <span style={{ color: '#9bb0c1' }}>· {pr.head_ref}</span>
            <span
              style={{
                marginLeft: 'auto',
                color: '#6f879b',
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
