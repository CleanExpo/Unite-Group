'use client'

// Mission Control "Margot Operational State" tile — the first Margot health
// surface. Config-presence booleans + last voice-session + agent heartbeat.
// Honest source badge; booleans/timestamps only (no key material).

import { useEffect, useState } from 'react'
import type { MargotHealthPayload } from '@/lib/command-centre/margot-health'
import { SourceBadge, type SourceMode } from '../SourceBadge'

const POLL_MS = 60000

function relTime(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return 'unknown'
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  return `${Math.round(sec / 86400)}d ago`
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--deck-cyan, #00F5FF)' : 'var(--deck-muted, #6f879b)' }}
      />
      <span style={{ color: 'var(--deck-text, #e6f7ff)', fontSize: 12 }}>{label}</span>
      <span style={{ marginLeft: 'auto', color: on ? 'var(--deck-cyan-text, #15803d)' : 'var(--deck-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {on ? 'present' : 'absent'}
      </span>
    </div>
  )
}

export function MargotHealthTile() {
  const [payload, setPayload] = useState<MargotHealthPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/command-centre/margot-health')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as MargotHealthPayload
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
    <section data-testid="margot-health-tile" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text, #e6f7ff)', fontSize: 14, fontWeight: 700, margin: 0 }}>Margot — operational state</h3>
        <SourceBadge mode={mode} label="Margot" lastUpdatedAt={payload?.generatedAt} />
      </div>

      {error && <p style={{ color: 'var(--deck-abort-text, #d02f35)', fontSize: 12, margin: 0 }}>Could not load Margot state: {error}</p>}

      {payload && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              aria-hidden
              style={{ width: 8, height: 8, borderRadius: '50%', background: payload.voiceReady ? 'var(--deck-cyan, #00F5FF)' : 'var(--deck-muted, #6f879b)' }}
            />
            <span style={{ color: 'var(--deck-text, #e6f7ff)', fontSize: 12, fontWeight: 600 }}>
              Voice endpoint {payload.voiceReady ? 'ready' : 'not configured'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
            <Flag on={payload.config.elevenLabsApiKey} label="ElevenLabs API key" />
            <Flag on={payload.config.margotAgentId} label="Margot agent id" />
            <Flag on={payload.config.ingestToken} label="Voice ingest token" />
            <Flag on={payload.config.founderConfigured} label="Founder id configured" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--deck-muted)', fontSize: 11, paddingTop: 4, borderTop: '1px solid var(--deck-line, rgba(207,224,236,0.12))' }}>
            <span>
              Last voice session:{' '}
              <b style={{ color: 'var(--deck-text, #e6f7ff)' }}>{relTime(payload.voice.latestSessionAt)}</b>
              {payload.voice.source === 'error' && <span style={{ color: 'var(--deck-abort-text, #d02f35)' }}> · read error</span>}
            </span>
            <span>{payload.voice.sessionsInWindow} in {payload.windowDays}d</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--deck-muted)', fontSize: 11 }}>
            <span>
              Agent heartbeat:{' '}
              <b style={{ color: 'var(--deck-text, #e6f7ff)' }}>{relTime(payload.agents.latestSeenAt)}</b>
              {payload.agents.source === 'error' && <span style={{ color: 'var(--deck-abort-text, #d02f35)' }}> · read error</span>}
            </span>
            <span>{payload.agents.activeCount} agent{payload.agents.activeCount === 1 ? '' : 's'} seen</span>
          </div>
        </>
      )}
    </section>
  )
}
