'use client'

// Founder console for the public site agent: mint keys, edit allow-lists,
// flip the kill switch, read today's usage, copy the embed snippet.
// Data and writes go through /api/founder/site-agent. Every section shows its
// own read failure — a failed read is never rendered as "nothing here".

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { LIGHT_THEME_DECK_TOKENS } from '@/components/command-centre/DeckDetails'
import { chatDailyPerKeyForPlan, SITE_AGENT_PLANS } from '@/lib/site-agent/plan-quota'

type Section<T> = { status: 'ok'; data: T } | { status: 'error'; error: string }

interface SiteKey {
  id: string
  business_key: string
  publishable_key: string
  allowed_origins: string[]
  active: boolean
  created_at: string
}

interface Controls {
  enabled: boolean
  chat_daily_per_key: number
  chat_daily_per_founder: number
  voice_daily_per_key: number
  voice_daily_per_founder: number
}

interface UsageRow {
  scope: string
  kind: 'chat' | 'voice'
  count: number
}

interface SiteAgentState {
  day: string
  businesses: Section<{ id: string; name: string; slug: string }[]>
  keys: Section<SiteKey[]>
  controls: Section<Controls | null>
  usage: Section<UsageRow[]>
}

const card = { background: 'var(--surface-card)', border: '1px solid var(--color-border)' }
const input = { background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }
const muted = { color: 'var(--color-text-muted)' }
const primary = { color: 'var(--color-text-primary)' }
const buttonClass = 'h-8 px-3 rounded-sm text-[12px] font-medium border disabled:opacity-40'
const buttonStyle = { color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }

function parseOrigins(text: string): string[] {
  return text.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean)
}

function usageCount(usage: Section<UsageRow[]>, scope: string, kind: 'chat' | 'voice'): string {
  if (usage.status === 'error') return 'unavailable'
  return String(usage.data.find((row) => row.scope === scope && row.kind === kind)?.count ?? 0)
}

function SectionError({ label, error }: { label: string; error: string }) {
  return (
    <p role="alert" className="text-[12px]" style={{ color: '#ef4444' }}>
      {label}: {error}
    </p>
  )
}

function KeyRow({
  siteKey,
  businessName,
  usage,
  busy,
  onUpdate,
}: {
  siteKey: SiteKey
  businessName: string | undefined
  usage: Section<UsageRow[]>
  busy: boolean
  onUpdate: (body: Record<string, unknown>) => Promise<boolean>
}) {
  const [origins, setOrigins] = useState(siteKey.allowed_origins.join('\n'))
  const [copied, setCopied] = useState(false)
  const host = typeof window === 'undefined' ? '' : window.location.origin
  const snippet = `<script src="${host}/widget/nexus-agent.js" data-site-key="${siteKey.publishable_key}" async></script>`

  return (
    <div className="rounded-sm px-4 py-3 flex flex-col gap-3" style={card}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[13px] font-medium" style={primary}>
            {businessName ?? siteKey.business_key} · {siteKey.active ? 'Active' : 'Inactive'}
          </span>
          <span className="text-[11px] truncate" style={muted}>
            {siteKey.publishable_key} · chats today: {usageCount(usage, `key:${siteKey.publishable_key}`, 'chat')}
          </span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onUpdate({ action: 'update_key', id: siteKey.id, active: !siteKey.active })}
          className={buttonClass}
          style={buttonStyle}
        >
          {siteKey.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
      <label className="flex flex-col gap-1 text-[11px]" style={muted}>
        Allowed origins (one per line — required)
        <textarea
          value={origins}
          onChange={(e) => setOrigins(e.target.value)}
          rows={2}
          className="rounded-sm px-3 py-2 text-[13px]"
          style={input}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onUpdate({ action: 'update_key', id: siteKey.id, allowedOrigins: parseOrigins(origins) })
          }
          className={buttonClass}
          style={buttonStyle}
        >
          Save origins
        </button>
      </div>
      <div className="flex items-start gap-2">
        <code className="flex-1 text-[11px] break-all rounded-sm px-3 py-2" style={{ ...input, ...muted }}>
          {snippet}
        </code>
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard.writeText(snippet).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
          className={buttonClass}
          style={buttonStyle}
        >
          {copied ? 'Copied' : 'Copy embed'}
        </button>
      </div>
    </div>
  )
}

export function SiteAgentAdminClient() {
  const [state, setState] = useState<SiteAgentState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<string>(SITE_AGENT_PLANS[0])
  const [form, setForm] = useState({ name: '', slug: '', origins: '' })

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch('/api/founder/site-agent', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState((await res.json()) as SiteAgentState)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Request failed')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      setBusy(true)
      setActionError(null)
      try {
        const res = await fetch('/api/founder/site-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null
          setActionError(payload?.error ?? `HTTP ${res.status}`)
          return false
        }
        await load()
        return true
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Request failed')
        return false
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  async function createSite(event: FormEvent) {
    event.preventDefault()
    const ok = await act({
      action: 'create_site',
      businessName: form.name,
      businessSlug: form.slug,
      allowedOrigins: parseOrigins(form.origins),
    })
    if (ok) setForm({ name: '', slug: '', origins: '' })
  }

  const planQuota = chatDailyPerKeyForPlan(plan)
  const agentEnabled = state?.controls.status === 'ok' && state.controls.data?.enabled === true
  const businessNames = new Map(
    state?.businesses.status === 'ok' ? state.businesses.data.map((b) => [b.slug, b.name]) : [],
  )

  return (
    <div className="p-6 flex flex-col gap-6 max-w-4xl" style={LIGHT_THEME_DECK_TOKENS}>
      <PageHeader
        title="Site agent"
        subtitle="Publishable keys, allow-lists, kill switch and today's usage for the embeddable chat agent."
      />

      {loadError && (
        <div className="rounded-sm px-4 py-3 text-[13px]" style={{ ...card, color: 'var(--color-text-secondary)' }}>
          The site-agent console failed to load ({loadError}).{' '}
          <button onClick={() => void load()} className="underline" style={primary}>
            Retry
          </button>
        </div>
      )}
      {actionError && <SectionError label="Last action failed" error={actionError} />}

      {state && (
        <>
          <section className="rounded-sm px-4 py-4 flex flex-col gap-3" style={card}>
            <h2 className="text-[13px] font-medium" style={primary}>Kill switch</h2>
            {state.controls.status === 'error' ? (
              <SectionError label="Kill switch state" error={state.controls.error} />
            ) : (
              <>
                <p className="text-[12px]" style={muted}>
                  {state.controls.data === null
                    ? 'Paused — no controls row yet. Every public chat is refused until it is turned on.'
                    : state.controls.data.enabled
                      ? `Live. Chat ceiling ${state.controls.data.chat_daily_per_key}/day per key (applies to every key), ${state.controls.data.chat_daily_per_founder}/day in total.`
                      : 'Paused. Every public chat is refused.'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act({ action: 'set_controls', enabled: !agentEnabled })}
                    className={buttonClass}
                    style={buttonStyle}
                  >
                    {agentEnabled ? 'Pause agent' : 'Turn agent on'}
                  </button>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="h-8 rounded-sm px-3 text-[13px]"
                    style={input}
                  >
                    {SITE_AGENT_PLANS.map((p) => {
                      const quota = chatDailyPerKeyForPlan(p)
                      return (
                        <option key={p} value={p}>
                          {p} — {quota.ok ? `${quota.chatDailyPerKey} chats/day per key` : 'ceiling not set'}
                        </option>
                      )
                    })}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !planQuota.ok}
                    onClick={() => void act({ action: 'set_controls', plan })}
                    className={buttonClass}
                    style={buttonStyle}
                  >
                    Apply plan ceiling
                  </button>
                </div>
              </>
            )}
            <p className="text-[11px]" style={muted}>
              Today ({state.day}, Brisbane): {usageCount(state.usage, '*founder', 'chat')} chats,{' '}
              {usageCount(state.usage, '*founder', 'voice')} voice sessions across all keys.
            </p>
            {state.usage.status === 'error' && <SectionError label="Usage" error={state.usage.error} />}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-medium" style={primary}>Site keys</h2>
            {state.businesses.status === 'error' && (
              <SectionError label="Businesses" error={state.businesses.error} />
            )}
            {state.keys.status === 'error' ? (
              <SectionError label="Site keys" error={state.keys.error} />
            ) : state.keys.data.length === 0 ? (
              <p className="text-[12px]" style={muted}>No site keys yet. Create one below.</p>
            ) : (
              state.keys.data.map((siteKey) => (
                <KeyRow
                  key={siteKey.id}
                  siteKey={siteKey}
                  businessName={businessNames.get(siteKey.business_key)}
                  usage={state.usage}
                  busy={busy}
                  onUpdate={act}
                />
              ))
            )}
          </section>

          <form onSubmit={(e) => void createSite(e)} className="rounded-sm px-4 py-4 flex flex-col gap-3" style={card}>
            <h2 className="text-[13px] font-medium" style={primary}>New client site</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-[11px]" style={muted}>
                Business name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8 rounded-sm px-3 text-[13px]"
                  style={input}
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px]" style={muted}>
                Slug (reuses an existing business with this slug)
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="acme-plumbing"
                  className="h-8 rounded-sm px-3 text-[13px]"
                  style={input}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[11px]" style={muted}>
              Allowed origins (one per line — at least one)
              <textarea
                required
                value={form.origins}
                onChange={(e) => setForm((f) => ({ ...f, origins: e.target.value }))}
                placeholder="https://www.client-site.com.au"
                rows={2}
                className="rounded-sm px-3 py-2 text-[13px]"
                style={input}
              />
            </label>
            <div className="flex justify-end">
              <button type="submit" disabled={busy} className={buttonClass} style={{ color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.4)' }}>
                {busy ? 'Working…' : 'Create site key'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
