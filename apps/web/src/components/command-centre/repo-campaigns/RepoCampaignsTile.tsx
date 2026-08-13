'use client'

// src/components/command-center/repo-campaigns/RepoCampaignsTile.tsx
// Mission Control "Campaigns (repos)" — every Unite-Group Nexus repo as a
// campaign, with live GitHub signal (open PRs = agents building, recent commits
// = active). Honest source: shows "not connected" rather than faking activity.

import { useEffect, useState } from 'react'
import type { RepoCampaignsPayload, CampaignEntry, CampaignState } from '@/lib/command-centre/repo-campaigns'
import { SourceBadge, type SourceMode } from '../SourceBadge'
import { StaleReadNotice } from '@/components/ui/StaleReadNotice'

const POLL_MS = 60000

const STATE_LABEL: Record<CampaignState, string> = {
  building: 'building',
  active: 'active',
  idle: 'idle',
  planned: 'planned',
  not_connected: 'not connected',
  archived: 'archived',
}

function stateColor(state: CampaignState): string {
  if (state === 'building') return 'var(--deck-cyan-text)'
  if (state === 'active') return 'var(--deck-text)'
  if (state === 'idle') return 'var(--deck-muted)'
  return 'var(--deck-muted)'
}

function CampaignRow({ c }: { c: CampaignEntry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', borderBottom: '1px solid var(--deck-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ color: 'var(--deck-text)', fontWeight: 600, fontSize: 13 }}>
          {c.name}
          {c.isActiveCampaign && <span style={{ color: 'var(--deck-cyan-text)', marginLeft: 6, fontSize: 10 }}>● active campaign</span>}
        </span>
        <span data-testid={`campaign-state-${c.name}`} style={{ color: stateColor(c.state), fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {STATE_LABEL[c.state]}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--deck-muted)', fontSize: 11 }}>
        <span>{c.repo ? <a href={`https://github.com/${c.repo}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{c.repo}</a> : c.purpose}</span>
        <span>{c.openPRs !== null ? `${c.openPRs} open PR${c.openPRs === 1 ? '' : 's'}` : (c.detail ?? '')}</span>
      </div>
    </div>
  )
}

export function RepoCampaignsTile() {
  const [payload, setPayload] = useState<RepoCampaignsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/command-centre/repo-campaigns')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as RepoCampaignsPayload
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

  // The poll above sets `error` and returns; `payload` keeps whatever the last
  // successful read produced. So every campaign row, and the summary counts
  // above them, survive a failed refresh and read as current. Keep them — one
  // flaky poll should not blank the tile — but mark them, per the two-sided
  // contract in components/ui/StaleReadNotice.tsx. This tile is READ-ONLY: it
  // has no control that acts on a campaign, so `actionsDisabled` stays off
  // rather than claiming an inertness there is nothing to enforce. The repo
  // links are left live deliberately — navigating to GitHub is the remedy for
  // staleness, not an act on stale data.
  const staleRead = Boolean(error) && payload !== null

  return (
    <section
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      data-stale-read={staleRead ? 'true' : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text)', fontSize: 14, fontWeight: 700, margin: 0 }}>Campaigns — Nexus repos</h3>
        <SourceBadge mode={mode} label="Campaigns" />
      </div>
      {error && <p role="alert" style={{ color: 'var(--deck-abort-text)', fontSize: 12, margin: 0 }}>Could not load campaigns: {error}</p>}
      {staleRead && <StaleReadNotice source="Campaigns — Nexus repos" />}
      {payload && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 11, margin: 0 }}>
          {payload.summary.activeCampaigns} active · {payload.summary.building} building · {payload.summary.idle} idle · {payload.summary.planned} planned
          {!payload.githubConnected && ' · GitHub not connected (set GITHUB_TOKEN for live signal)'}
        </p>
      )}
      <div>{payload?.campaigns.map((c) => <CampaignRow key={c.name} c={c} />)}</div>
    </section>
  )
}
