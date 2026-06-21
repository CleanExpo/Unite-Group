'use client'

// src/components/command-center/provider-accounts/ProviderAccountsTile.tsx
// Register & monitor the LLM provider accounts the router pools. Shows each
// plan's live state; the add form references a vault entry by id so the key
// never leaves the vault. Metadata only — no secrets rendered.

import { useCallback, useEffect, useState } from 'react'
import { SourceBadge, type SourceMode } from '../SourceBadge'

interface AccountView {
  accountId: string
  provider: string
  label: string
  planKind: string
  state: string
  usable: boolean
  prepaidExhausted: boolean
  coolingUntil: string | null
}
interface VaultEntry { id: string; label: string; service: string }

const PROVIDERS = ['claude', 'openai', 'minimax', 'gemini', 'openrouter'] as const

function stateColor(state: string, usable: boolean): string {
  if (state === 'available') return 'var(--cc-ink)'
  if (state === 'watching') return 'var(--cc-ink-dim)'
  if (state === 'near_limit' || state === 'blocked') return 'var(--cc-signal)'
  if (usable) return 'var(--cc-ink)'
  return 'var(--cc-ink-hush)'
}

export function ProviderAccountsTile() {
  const [accounts, setAccounts] = useState<AccountView[]>([])
  const [vault, setVault] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ provider: 'minimax', label: '', vaultEntryId: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [accRes, vaultRes] = await Promise.all([
        fetch('/api/command-center/provider-accounts'),
        fetch('/api/vault/entries').catch(() => null),
      ])
      if (!accRes.ok) throw new Error(`HTTP ${accRes.status}`)
      const accData = await accRes.json()
      setAccounts(accData.accounts ?? [])
      if (vaultRes?.ok) {
        const v = await vaultRes.json()
        setVault(Array.isArray(v) ? v : (v.entries ?? []))
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addAccount() {
    if (!form.label || !form.vaultEntryId) { setError('label and a vault entry are required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/command-center/provider-accounts', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? `HTTP ${res.status}`) }
      setForm({ provider: 'minimax', label: '', vaultEntryId: '' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'add failed')
    } finally { setSaving(false) }
  }

  const mode: SourceMode = loading ? 'loading' : error ? 'degraded' : 'live'
  const inputStyle = { background: 'transparent', border: '1px solid var(--cc-line, rgba(255,255,255,0.12))', color: 'var(--cc-ink)', borderRadius: 2, padding: '4px 6px', fontSize: 12 }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--cc-ink)', fontSize: 14, fontWeight: 700, margin: 0 }}>Provider accounts — LLM pool</h3>
        <SourceBadge mode={mode} label="Accounts" />
      </div>

      {accounts.length === 0 && !loading && (
        <p style={{ color: 'var(--cc-ink-hush)', fontSize: 12, margin: 0 }}>
          No provider accounts yet. Add a vault entry for each key, then register it below — the router pools across them.
        </p>
      )}

      <div>
        {accounts.map((a) => (
          <div key={a.accountId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--cc-line, rgba(255,255,255,0.06))', fontSize: 12 }}>
            <span style={{ color: 'var(--cc-ink)' }}>{a.label} <span style={{ color: 'var(--cc-ink-hush)' }}>· {a.provider} · {a.planKind}</span></span>
            <span data-testid={`account-state-${a.accountId}`} style={{ color: stateColor(a.state, a.usable), textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>
              {a.prepaidExhausted ? 'exhausted' : a.coolingUntil ? 'cooling' : a.state}
            </span>
          </div>
        ))}
      </div>

      {error && <p style={{ color: 'var(--cc-signal)', fontSize: 12, margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
        <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} style={inputStyle}>
          {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input placeholder="label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={inputStyle} />
        <select value={form.vaultEntryId} onChange={(e) => setForm({ ...form, vaultEntryId: e.target.value })} style={inputStyle}>
          <option value="">— vault key —</option>
          {vault.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.service})</option>)}
        </select>
        <button onClick={addAccount} disabled={saving} style={{ ...inputStyle, cursor: 'pointer', color: 'var(--cc-ink)' }}>
          {saving ? 'adding…' : 'add account'}
        </button>
      </div>
    </section>
  )
}
