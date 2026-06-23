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
  enabled: boolean
  state: string
  usable: boolean
  prepaidExhausted: boolean
  coolingUntil: string | null
}
interface VaultEntry { id: string; label: string; service: string }

const PROVIDERS = ['claude', 'openai', 'minimax', 'gemini', 'openrouter'] as const

function stateColor(state: string, usable: boolean): string {
  if (state === 'available') return 'var(--deck-text)'
  if (state === 'watching') return 'var(--deck-muted)'
  if (state === 'near_limit' || state === 'blocked') return 'var(--deck-abort)'
  if (usable) return 'var(--deck-text)'
  return 'rgba(207,224,236,0.45)'
}

export function ProviderAccountsTile() {
  const [accounts, setAccounts] = useState<AccountView[]>([])
  const [vault, setVault] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ provider: 'minimax', label: '', vaultEntryId: '' })
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

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
    if (!form.label) { setError('a label is required'); return }
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

  async function toggleAccount(accountId: string, enabled: boolean) {
    setBusyId(accountId)
    try {
      const res = await fetch('/api/command-center/provider-accounts', {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId, enabled }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? `HTTP ${res.status}`) }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'toggle failed')
    } finally { setBusyId(null) }
  }

  async function removeAccount(accountId: string) {
    setBusyId(accountId)
    try {
      const res = await fetch('/api/command-center/provider-accounts', {
        method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountId }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? `HTTP ${res.status}`) }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'remove failed')
    } finally { setBusyId(null) }
  }

  async function testPool() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/command-center/provider-test', { method: 'POST' })
      const j = await res.json()
      if (j.status === 'ok') setTestResult(`✓ ${j.provider} replied: "${(j.text ?? '').trim().slice(0, 40)}"`)
      else if (j.status === 'queued') setTestResult(`queued — no usable provider (${j.reason ?? ''})`)
      else if (j.status === 'needs_anthropic_path') setTestResult(`routed to ${j.provider} (uses the Claude path, not this test)`)
      else if (j.status === 'no_accounts') setTestResult('register a provider account first')
      else setTestResult(`error: ${j.reason ?? 'unknown'}`)
    } catch (e) {
      setTestResult(`error: ${e instanceof Error ? e.message : 'request failed'}`)
    } finally { setTesting(false) }
  }

  const mode: SourceMode = loading ? 'loading' : error ? 'degraded' : 'live'
  const inputStyle = { background: 'transparent', border: '1px solid var(--deck-line)', color: 'var(--deck-text)', borderRadius: 2, padding: '4px 6px', fontSize: 12 }
  const ctrlStyle = { background: 'transparent', border: '1px solid var(--deck-line)', color: 'var(--deck-text)', borderRadius: 2, padding: '2px 6px', fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text)', fontSize: 14, fontWeight: 700, margin: 0 }}>Provider accounts — LLM pool</h3>
        <SourceBadge mode={mode} label="Accounts" />
      </div>

      {accounts.length === 0 && !loading && (
        <p style={{ color: 'rgba(207,224,236,0.45)', fontSize: 12, margin: 0 }}>
          No provider accounts yet. Add a vault entry for each key, then register it below — the router pools across them.
        </p>
      )}

      <div>
        {accounts.map((a) => (
          <div key={a.accountId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--deck-line)', fontSize: 12 }}>
            <span style={{ color: a.enabled ? 'var(--deck-text)' : 'rgba(207,224,236,0.45)' }}>
              {a.label} <span style={{ color: 'rgba(207,224,236,0.45)' }}>· {a.provider} · {a.planKind}</span>
              {!a.enabled && <span style={{ color: 'rgba(207,224,236,0.45)' }}> · disabled</span>}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span data-testid={`account-state-${a.accountId}`} style={{ color: stateColor(a.state, a.usable), textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>
                {a.prepaidExhausted ? 'exhausted' : a.coolingUntil ? 'cooling' : a.state}
              </span>
              <button
                data-testid={`account-toggle-${a.accountId}`}
                onClick={() => toggleAccount(a.accountId, !a.enabled)}
                disabled={busyId === a.accountId}
                style={ctrlStyle}
              >
                {busyId === a.accountId ? '…' : a.enabled ? 'disable' : 'enable'}
              </button>
              <button
                data-testid={`account-remove-${a.accountId}`}
                onClick={() => removeAccount(a.accountId)}
                disabled={busyId === a.accountId}
                style={{ ...ctrlStyle, color: 'var(--deck-abort)', borderColor: 'var(--deck-abort)' }}
              >
                remove
              </button>
            </span>
          </div>
        ))}
      </div>

      {error && <p style={{ color: 'var(--deck-abort)', fontSize: 12, margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
        <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} style={inputStyle}>
          {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input placeholder="label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={inputStyle} />
        <select value={form.vaultEntryId} onChange={(e) => setForm({ ...form, vaultEntryId: e.target.value })} style={inputStyle}>
          <option value="">— use env var key —</option>
          {vault.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.service})</option>)}
        </select>
        <button onClick={addAccount} disabled={saving} style={{ ...inputStyle, cursor: 'pointer', color: 'var(--deck-text)' }}>
          {saving ? 'adding…' : 'add account'}
        </button>
        <button onClick={testPool} disabled={testing || accounts.length === 0} style={{ ...inputStyle, cursor: 'pointer', color: 'var(--deck-text)' }}>
          {testing ? 'testing…' : 'test the pool'}
        </button>
      </div>
      {testResult && <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>{testResult}</p>}
    </section>
  )
}
