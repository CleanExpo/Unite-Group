'use client'

// Mission Control "Per-person contractor activity" tile. GitHub commits by
// author on CCW-CRM, bucketed per contractor (Rana first). Every figure is
// activity-derived, NOT clock hours — the founder-approved disclaimer is always
// rendered. Honest source badge; never fakes activity when GitHub is unwired.

import { useEffect, useState } from 'react'
import type { TeamActivityPayload, MemberActivity } from '@/lib/command-centre/team-activity'
import { SourceBadge, type SourceMode } from '../SourceBadge'

const POLL_MS = 120000

function MemberCard({ m }: { m: MemberActivity }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0', borderBottom: '1px solid var(--deck-line, rgba(207,224,236,0.12))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: 'var(--deck-text, #e6f7ff)', fontWeight: 600, fontSize: 13 }}>{m.name}</span>
        <span style={{ color: 'var(--deck-cyan-text, #15803d)', fontSize: 11 }}>
          {m.activeDays} active day{m.activeDays === 1 ? '' : 's'} · {m.commitCount} commit{m.commitCount === 1 ? '' : 's'}
        </span>
      </div>

      {m.daySpans.length === 0 ? (
        <span style={{ color: 'var(--deck-muted)', fontSize: 11 }}>No commits in the window.</span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {m.daySpans.map((d) => (
            <span key={d.date} style={{ color: 'var(--deck-muted)', fontSize: 11, background: 'rgba(0,245,255,0.06)', padding: '1px 6px', borderRadius: 2 }}>
              {d.date}: {d.firstAt}–{d.lastAt} AEST ({d.commitCount})
            </span>
          ))}
        </div>
      )}

      {m.recentSubjects.length > 0 && (
        <ul style={{ margin: '2px 0 0', paddingLeft: 14, color: 'var(--deck-muted)', fontSize: 11 }}>
          {m.recentSubjects.map((s, i) => (
            <li key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TeamActivityTile() {
  const [payload, setPayload] = useState<TeamActivityPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/command-centre/team-activity')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as TeamActivityPayload
        if (alive) { setPayload(data); setError(null) }
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

  const mode: SourceMode = loading ? 'loading' : error || !payload ? 'degraded' : 'live'

  return (
    <section data-testid="team-activity-tile" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text, #e6f7ff)', fontSize: 14, fontWeight: 700, margin: 0 }}>Team activity — {payload?.repo ?? 'CCW-CRM'}</h3>
        <SourceBadge mode={mode} label="Team activity" lastUpdatedAt={payload?.generatedAt} />
      </div>

      {payload && (
        <p data-testid="team-activity-disclaimer" style={{ color: 'var(--deck-amber-text, #b45309)', fontSize: 11, margin: 0 }}>
          {payload.disclaimer}
        </p>
      )}

      {error && <p style={{ color: 'var(--deck-abort-text, #d02f35)', fontSize: 12, margin: 0 }}>Could not load team activity: {error}</p>}

      {payload && payload.github !== 'live' && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 11, margin: 0 }}>
          GitHub {payload.github === 'not_connected' ? 'not connected' : 'signal error'}
          {payload.githubDetail ? ` — ${payload.githubDetail}` : ''}
        </p>
      )}

      {payload && <div>{payload.members.map((m) => <MemberCard key={m.id} m={m} />)}</div>}

      {payload && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 11, margin: 0 }}>
          Linear (issues by assignee): source not connected — {payload.linear.detail}
        </p>
      )}
    </section>
  )
}
