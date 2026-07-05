'use client'

// Mission Control "Email-account roster" tile. Founder-scoped connection state
// for email-relevant providers (Google / Microsoft / IMAP / SendGrid). READ-only
// — surfaces state and links to Settings to connect/reconnect; never touches
// OAuth routes. Honest source badge; absence renders as "not connected".

import { useEffect, useState } from 'react'
import type { EmailAccountsPayload, EmailAccountState } from '@/lib/command-centre/email-accounts'
import { SourceBadge, type SourceMode } from '../SourceBadge'

const POLL_MS = 120000

const STATE_LABEL: Record<EmailAccountState, string> = {
  connected: 'connected',
  needs_reauth: 'needs reauth',
  not_connected: 'not connected',
}

function stateColor(state: EmailAccountState): string {
  if (state === 'connected') return 'var(--deck-cyan, #00F5FF)'
  if (state === 'needs_reauth') return '#fbbf24'
  return 'rgba(207,224,236,0.45)'
}

function relTime(iso: string | null): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return null
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`
  return `${Math.round(sec / 86400)}d ago`
}

export function EmailAccountsTile() {
  const [payload, setPayload] = useState<EmailAccountsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/command-centre/email-accounts')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as EmailAccountsPayload
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
    <section data-testid="email-accounts-tile" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text, #e6f7ff)', fontSize: 14, fontWeight: 700, margin: 0 }}>Email accounts</h3>
        <SourceBadge mode={mode} label="Email accounts" lastUpdatedAt={payload?.generatedAt} />
      </div>

      {payload && (
        <p style={{ color: 'rgba(207,224,236,0.45)', fontSize: 11, margin: 0 }}>
          {payload.summary.connected} connected · {payload.summary.needsReauth} need reauth · {payload.summary.notConnected} not connected
        </p>
      )}

      {error && <p style={{ color: 'var(--deck-abort, #f87171)', fontSize: 12, margin: 0 }}>Could not load email accounts: {error}</p>}

      {payload && (
        <div>
          {payload.providers.map((p) => {
            const rel = relTime(p.lastActivityAt)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--deck-line, rgba(207,224,236,0.12))' }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: stateColor(p.state) }} />
                <span style={{ color: 'var(--deck-text, #e6f7ff)', fontSize: 12 }}>{p.label}</span>
                <span style={{ marginLeft: 'auto', color: stateColor(p.state), fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {STATE_LABEL[p.state]}
                </span>
                {rel && <span style={{ color: 'rgba(207,224,236,0.4)', fontSize: 10 }}>{rel}</span>}
              </div>
            )
          })}
        </div>
      )}

      <a href="/founder/settings" style={{ color: 'var(--deck-cyan, #00F5FF)', fontSize: 11, textDecoration: 'underline' }}>
        ↗ manage in Settings
      </a>
    </section>
  )
}
