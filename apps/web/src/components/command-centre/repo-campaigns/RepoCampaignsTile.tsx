'use client'

// src/components/command-center/repo-campaigns/RepoCampaignsTile.tsx
// Mission Control "Campaigns (repos)" — every Unite-Group Nexus repo as a
// campaign, with live GitHub signal (open PRs = agents building, recent commits
// = active). Honest source: shows "not connected" rather than faking activity.

import { useEffect, useState } from 'react'
import type { RepoCampaignsPayload, CampaignEntry, CampaignState } from '@/lib/command-centre/repo-campaigns'
import { SourceBadge, type SourceMode } from '../SourceBadge'

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

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text)', fontSize: 14, fontWeight: 700, margin: 0 }}>Campaigns — Nexus repos</h3>
        <SourceBadge mode={mode} label="Campaigns" />
      </div>
      {payload && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 11, margin: 0 }}>
          {payload.summary.activeCampaigns} active · {payload.summary.building} building · {payload.summary.idle} idle · {payload.summary.planned} planned
          {!payload.githubConnected && ' · GitHub not connected (set GITHUB_TOKEN for live signal)'}
        </p>
      )}
      {error && <p style={{ color: 'var(--deck-abort-text)', fontSize: 12, margin: 0 }}>Could not load campaigns: {error}</p>}
      <div>{payload?.campaigns.map((c) => <CampaignRow key={c.name} c={c} />)}</div>
    </section>
  )
}
