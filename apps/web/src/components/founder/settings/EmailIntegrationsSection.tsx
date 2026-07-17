// src/components/founder/settings/EmailIntegrationsSection.tsx
// Settings → Integrations — Email accounts.
// Lets the founder connect and manage MULTIPLE Gmail/Outlook mailboxes per
// provider: every connected account is listed with its status, a per-account
// Reconnect (re-run OAuth) and Disconnect action, plus a clear "Add another
// account" affordance (UNI-2153).
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mail, Link2, Plus, Pencil, ChevronDown } from 'lucide-react'

import type { FounderVoice } from '@/lib/margot/draft-reply-prompt'

interface ProviderAccount {
  email: string
  label: string
  needsReauth?: boolean
}

interface IntegrationsStatus {
  google: { configured: boolean; accounts: ProviderAccount[] }
  microsoft: { configured: boolean; accounts: ProviderAccount[] }
}

type ProviderService = 'google' | 'microsoft'

interface Props {
  founderEmail: string | null
}

export function EmailIntegrationsSection({ founderEmail }: Props) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectEmail, setConnectEmail] = useState('')
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const [focusErrorOnRender, setFocusErrorOnRender] = useState(false)

  useEffect(() => {
    if (focusErrorOnRender && error && errorRef.current) {
      errorRef.current.focus()
      setFocusErrorOnRender(false)
    }
  }, [focusErrorOnRender, error])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/integrations')
      if (!res.ok) throw new Error('Failed to load integration status')
      const data = (await res.json()) as IntegrationsStatus
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integration status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (founderEmail) setConnectEmail((current) => current || founderEmail)
  }, [founderEmail])

  const handleConfirmDisconnect = useCallback(
    async (service: ProviderService, email: string) => {
      setConfirming(null)
      setDisconnecting(`${service}:${email}`)
      try {
        const res = await fetch('/api/settings/integrations/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service, email }),
        })
        if (!res.ok) throw new Error('Failed to disconnect account')
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to disconnect account')
        setFocusErrorOnRender(true)
      } finally {
        setDisconnecting(null)
      }
    },
    [load],
  )

  const requestConfirm = useCallback((service: ProviderService, email: string) => {
    setConfirming(`${service}:${email}`)
  }, [])

  const cancelConfirm = useCallback(() => {
    setConfirming(null)
  }, [])

  const emailToConnect = connectEmail.trim()

  return (
    <section
      className="rounded-sm p-5"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)' }}
    >
      <h2
        className="text-[13px] font-medium uppercase tracking-wider mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Integrations — Email Accounts
      </h2>

      {loading && (
        <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          Loading…
        </p>
      )}

      {error && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="text-[13px] mb-3 focus:outline-hidden"
          style={{ color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      )}

      {status && (
        <div className="flex flex-col gap-4">
          <ProviderRow
            name="Google"
            service="google"
            configured={status.google.configured}
            accounts={status.google.accounts}
            emailToConnect={emailToConnect}
            disconnecting={disconnecting}
            confirming={confirming}
            anyDisconnecting={disconnecting !== null}
            onRequestConfirm={requestConfirm}
            onCancelConfirm={cancelConfirm}
            onConfirmDisconnect={handleConfirmDisconnect}
          />
          <ProviderRow
            name="Microsoft"
            service="microsoft"
            configured={status.microsoft.configured}
            accounts={status.microsoft.accounts}
            emailToConnect={emailToConnect}
            disconnecting={disconnecting}
            confirming={confirming}
            anyDisconnecting={disconnecting !== null}
            onRequestConfirm={requestConfirm}
            onCancelConfirm={cancelConfirm}
            onConfirmDisconnect={handleConfirmDisconnect}
          />

          <div className="rounded-sm p-3" style={{ border: '1px dashed var(--color-border)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Plus size={13} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Add another account
              </span>
            </div>
            <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-disabled)' }}>
              Connect as many Google or Microsoft mailboxes as you need. Enter the address, then
              choose its provider above — repeat for each account.
            </p>
            <label
              htmlFor="email-integrations-connect-email"
              className="block text-[11px] mb-1"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              Email address to connect
            </label>
            <input
              id="email-integrations-connect-email"
              type="email"
              value={connectEmail}
              onChange={(e) => setConnectEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-sm px-3 h-9 text-[13px] focus:outline-hidden"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function ProviderRow({
  name,
  service,
  configured,
  accounts,
  emailToConnect,
  disconnecting,
  confirming,
  anyDisconnecting,
  onRequestConfirm,
  onCancelConfirm,
  onConfirmDisconnect,
}: {
  name: string
  service: ProviderService
  configured: boolean
  accounts: ProviderAccount[]
  emailToConnect: string
  disconnecting: string | null
  confirming: string | null
  anyDisconnecting: boolean
  onRequestConfirm: (service: ProviderService, email: string) => void
  onCancelConfirm: () => void
  onConfirmDisconnect: (service: ProviderService, email: string) => void
}) {
  const disabled = !emailToConnect
  const buttonDisabled = disabled || !configured
  const hasAccounts = accounts.length > 0
  const connectLabel = hasAccounts ? `Add another ${name} account` : `Connect ${name}`
  const authorizeHref = `/api/auth/${service}/authorize?email=${encodeURIComponent(emailToConnect)}`
  const buttonClassName =
    'flex items-center gap-1.5 px-3 h-7 rounded-sm text-[12px] font-medium transition-opacity'
  const buttonStyle = {
    background: buttonDisabled ? 'var(--surface-elevated)' : '#16a34a18',
    color: buttonDisabled ? 'var(--color-text-disabled)' : '#15803d',
    border: `1px solid ${buttonDisabled ? 'var(--color-border)' : '#16a34a30'}`,
  }
  const buttonTitle = !configured ? `${name} OAuth is not configured on this deployment` : undefined

  return (
    <div className="rounded-sm p-3" style={{ border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Mail size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {name}
          </span>
        </div>
        {buttonDisabled ? (
          <button type="button" disabled title={buttonTitle} className={buttonClassName} style={{ ...buttonStyle, cursor: 'not-allowed' }}>
            <Link2 size={12} strokeWidth={1.5} />
            {connectLabel}
          </button>
        ) : (
          <a href={authorizeHref} className={buttonClassName} style={{ ...buttonStyle, cursor: 'pointer' }}>
            <Link2 size={12} strokeWidth={1.5} />
            {connectLabel}
          </a>
        )}
      </div>

      {!configured && (
        <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
          {name} OAuth is not configured on this deployment.
        </p>
      )}

      {configured && !hasAccounts && (
        <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
          No {name} accounts connected yet.
        </p>
      )}

      {configured && hasAccounts && (
        <ul className="flex flex-col gap-1.5">
          {accounts.map((account) => {
            const reconnectHref = `/api/auth/${service}/authorize?email=${encodeURIComponent(account.email)}`
            const isDisconnecting = disconnecting === `${service}:${account.email}`
            const isConfirming = confirming === `${service}:${account.email}`
            return (
              <li
                key={account.email}
                aria-busy={isDisconnecting}
                className="flex flex-col gap-1.5 text-[12px]"
              >
                <div className="flex items-center justify-between gap-2">
                <span
                  className="truncate"
                  title={account.email}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {account.email}
                </span>
                <div aria-live="polite" className="flex items-center gap-2 shrink-0">
                  {isConfirming ? (
                    <>
                      <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                        Confirm remove {account.email}?
                      </span>
                      <button
                        type="button"
                        onClick={() => onConfirmDisconnect(service, account.email)}
                        disabled={anyDisconnecting}
                        aria-label={`Confirm remove ${account.email}`}
                        className="text-[11px] underline-offset-2 hover:underline disabled:opacity-50"
                        style={{ color: 'var(--color-danger)', cursor: anyDisconnecting ? 'not-allowed' : 'pointer' }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={onCancelConfirm}
                        aria-label={`Cancel removing ${account.email}`}
                        className="text-[11px] underline-offset-2 hover:underline"
                        style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {account.needsReauth ? (
                        <span
                          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                          style={{ color: '#b45309', background: '#f59e0b1a', border: '1px solid #f59e0b30' }}
                        >
                          Needs reauth
                        </span>
                      ) : (
                        <span
                          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                          style={{ color: '#15803d', background: '#16a34a18', border: '1px solid #16a34a30' }}
                        >
                          Connected
                        </span>
                      )}
                      <a
                        href={reconnectHref}
                        aria-label={`Reconnect ${account.email}`}
                        aria-disabled={anyDisconnecting || undefined}
                        tabIndex={anyDisconnecting ? -1 : undefined}
                        className="text-[11px] underline-offset-2 hover:underline"
                        style={{
                          color: 'var(--color-text-muted)',
                          pointerEvents: anyDisconnecting ? 'none' : undefined,
                          opacity: anyDisconnecting ? 0.5 : undefined,
                        }}
                      >
                        Reconnect
                      </a>
                      <button
                        type="button"
                        onClick={() => onRequestConfirm(service, account.email)}
                        disabled={anyDisconnecting}
                        aria-label={`Disconnect ${account.email}`}
                        className="text-[11px] underline-offset-2 hover:underline disabled:opacity-50"
                        style={{ color: 'var(--color-danger)', cursor: anyDisconnecting ? 'not-allowed' : 'pointer' }}
                      >
                        {isDisconnecting ? 'Removing…' : 'Disconnect'}
                      </button>
                    </>
                  )}
                </div>
                </div>
                <AccountVoiceEditor accountEmail={account.email} />
                <AccountSignaturePreview accountEmail={account.email} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// Collapsible per-account copywriter voice editor (task 21 / UNI-2153).
// Reads GET /api/settings/integrations/voice and saves via PUT. Fetches lazily
// on expand so it never fires on the settings load. Nothing here sends or drafts
// email — it only stores the voice a Margot draft would use.
function AccountVoiceEditor({ accountEmail }: { accountEmail: string }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [signOff, setSignOff] = useState('')
  const [tone, setTone] = useState('')
  const [neverDo, setNeverDo] = useState('')
  // Slice 2: per-account auto-draft toggle. Off by default (dark).
  const [agentEnabled, setAgentEnabled] = useState(false)
  const [togglingAgent, setTogglingAgent] = useState(false)

  const applyVoice = useCallback((voice: FounderVoice) => {
    setName(voice.name)
    setSignOff(voice.signOff)
    setTone((voice.toneGuidelines ?? []).join('\n'))
    setNeverDo((voice.neverDo ?? []).join('\n'))
  }, [])

  const loadVoice = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/settings/integrations/voice?account_email=${encodeURIComponent(accountEmail)}`,
      )
      if (!res.ok) throw new Error('Failed to load voice')
      const data = (await res.json()) as {
        isCustom: boolean
        voice: FounderVoice
        agentEnabled?: boolean
      }
      setIsCustom(data.isCustom)
      setAgentEnabled(data.agentEnabled ?? false)
      applyVoice(data.voice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voice')
    } finally {
      setLoading(false)
    }
  }, [accountEmail, applyVoice])

  // Flip the auto-draft toggle. Persists agent_enabled only — never touches the
  // voice fields. Optimistic; reverts on failure. Nothing here sends or drafts.
  const handleToggleAgent = useCallback(async () => {
    const next = !agentEnabled
    setTogglingAgent(true)
    setStatus('')
    setError(null)
    setAgentEnabled(next)
    try {
      const res = await fetch('/api/settings/integrations/voice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_email: accountEmail, agent_enabled: next }),
      })
      if (!res.ok) throw new Error('Failed to update auto-draft')
      setStatus(next ? 'Auto-draft on' : 'Auto-draft off')
    } catch (err) {
      setAgentEnabled(!next)
      setError(err instanceof Error ? err.message : 'Failed to update auto-draft')
    } finally {
      setTogglingAgent(false)
    }
  }, [accountEmail, agentEnabled])

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev
      if (next) void loadVoice()
      return next
    })
  }, [loadVoice])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setStatus('')
    setError(null)
    try {
      const res = await fetch('/api/settings/integrations/voice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_email: accountEmail,
          name,
          signOff,
          toneGuidelines: tone.split('\n').map((s) => s.trim()).filter(Boolean),
          neverDo: neverDo.split('\n').map((s) => s.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error('Failed to save voice')
      setIsCustom(true)
      setEditing(false)
      setStatus('Voice saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voice')
    } finally {
      setSaving(false)
    }
  }, [accountEmail, name, signOff, tone, neverDo])

  const fieldStyle = {
    background: 'var(--surface-card)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  }
  const labelClass = 'block text-[11px] mb-0.5'
  const labelStyle = { color: 'var(--color-text-disabled)' }

  return (
    <div className="mt-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={`Copywriter voice for ${accountEmail}`}
        className="flex items-center gap-1 text-[11px] underline-offset-2 hover:underline"
        style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
      >
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        Copywriter voice
      </button>

      {expanded && (
        <div
          role="region"
          aria-label={`Copywriter voice editor for ${accountEmail}`}
          className="rounded-sm p-3 mt-1.5"
          style={{ border: '1px solid var(--color-border)', background: 'var(--surface-elevated)' }}
        >
          <div className="flex items-start justify-between gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Auto-draft replies
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
                When on, Margot pre-writes reply drafts for this mailbox. Drafts are
                saved for your approval and are never sent automatically.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={agentEnabled}
              aria-label={`Auto-draft replies for ${accountEmail}`}
              onClick={handleToggleAgent}
              disabled={togglingAgent}
              className="relative shrink-0 w-9 h-5 rounded-sm transition-colors disabled:opacity-50"
              style={{
                background: agentEnabled ? '#16a34a' : 'var(--color-border)',
                cursor: togglingAgent ? 'not-allowed' : 'pointer',
              }}
            >
              <span
                aria-hidden="true"
                className="absolute top-0.5 h-4 w-4 rounded-sm transition-transform"
                style={{
                  background: 'var(--surface-card)',
                  transform: agentEnabled ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>
          {loading ? (
            <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
              Loading…
            </p>
          ) : editing ? (
            <div className="flex flex-col gap-2">
              <div>
                <label className={labelClass} style={labelStyle} htmlFor={`voice-name-${accountEmail}`}>
                  Name
                </label>
                <input
                  id={`voice-name-${accountEmail}`}
                  aria-label={`Voice name for ${accountEmail}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-sm px-2 h-8 text-[12px] focus:outline-hidden"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle} htmlFor={`voice-signoff-${accountEmail}`}>
                  Sign-off
                </label>
                <input
                  id={`voice-signoff-${accountEmail}`}
                  aria-label={`Sign-off for ${accountEmail}`}
                  value={signOff}
                  onChange={(e) => setSignOff(e.target.value)}
                  className="w-full rounded-sm px-2 h-8 text-[12px] focus:outline-hidden"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle} htmlFor={`voice-tone-${accountEmail}`}>
                  Tone guidelines (one per line)
                </label>
                <textarea
                  id={`voice-tone-${accountEmail}`}
                  aria-label={`Tone guidelines for ${accountEmail}`}
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  rows={3}
                  className="w-full rounded-sm px-2 py-1.5 text-[12px] focus:outline-hidden"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle} htmlFor={`voice-neverdo-${accountEmail}`}>
                  Never do (one per line)
                </label>
                <textarea
                  id={`voice-neverdo-${accountEmail}`}
                  aria-label={`Never-do list for ${accountEmail}`}
                  value={neverDo}
                  onChange={(e) => setNeverDo(e.target.value)}
                  rows={3}
                  className="w-full rounded-sm px-2 py-1.5 text-[12px] focus:outline-hidden"
                  style={fieldStyle}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  aria-label={`Save copywriter voice for ${accountEmail}`}
                  className="px-3 h-7 rounded-sm text-[12px] font-medium disabled:opacity-50"
                  style={{ background: '#16a34a18', color: '#15803d', border: '1px solid #16a34a30', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving…' : 'Save voice'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  aria-label={`Cancel editing voice for ${accountEmail}`}
                  className="text-[11px] underline-offset-2 hover:underline"
                  style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
                {isCustom ? `Custom voice — signs off as ${name}` : 'Using the default voice'}
              </span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={`Edit copywriter voice for ${accountEmail}`}
                className="flex items-center gap-1 text-[11px] underline-offset-2 hover:underline"
                style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <Pencil size={12} strokeWidth={1.5} />
                Edit
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="text-[11px] mt-2" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}
          <span aria-live="polite" className="sr-only">
            {status}
          </span>
        </div>
      )}
    </div>
  )
}

// Proposed, founder-editable default slogan. Mirrors DEFAULT_SLOGAN in
// lib/email/signature.ts — kept as a local literal because that module pulls in
// server-only code (service-role Supabase client) and must not enter the client
// bundle. NOT an asserted brand line — shown as an editable suggestion.
const PROPOSED_SLOGAN = 'One command centre. Every venture, connected.'

// Collapsible per-account signature footer preview (UNI-2153). Renders the
// generated, email-safe footer for the account via
// GET /api/settings/integrations/signature. Personal mailboxes return
// { html: null } with an honest note. The Slogan input re-renders the preview
// via ?slogan= (live, non-persisting); Save persists it through the voice PUT.
// The preview HTML is our own generated, escaped output — never arbitrary user
// HTML — so dangerouslySetInnerHTML in a bordered, founder-only box is fine.
function AccountSignaturePreview({ accountEmail }: { accountEmail: string }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [slogan, setSlogan] = useState(PROPOSED_SLOGAN)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const loadPreview = useCallback(
    async (sloganOverride?: string) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ account: accountEmail })
        if (sloganOverride && sloganOverride.trim()) {
          params.set('slogan', sloganOverride.trim())
        }
        const res = await fetch(
          `/api/settings/integrations/signature?${params.toString()}`,
        )
        if (!res.ok) throw new Error('Failed to load signature')
        const data = (await res.json()) as { html: string | null; note?: string; slogan?: string }
        setHtml(data.html)
        setNote(data.note ?? null)
        // Hydrate the input from the stored slogan on initial/refresh load (not
        // during live-preview typing), so Save never clobbers a saved slogan.
        if (!sloganOverride && data.slogan) setSlogan(data.slogan)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load signature')
      } finally {
        setLoading(false)
      }
    },
    [accountEmail],
  )

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev
      if (next) void loadPreview()
      return next
    })
  }, [loadPreview])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setStatus('')
    setError(null)
    try {
      const res = await fetch('/api/settings/integrations/voice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_email: accountEmail, slogan }),
      })
      if (!res.ok) throw new Error('Failed to save slogan')
      setStatus('Slogan saved')
      await loadPreview()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save slogan')
    } finally {
      setSaving(false)
    }
  }, [accountEmail, slogan, loadPreview])

  const fieldStyle = {
    background: 'var(--surface-card)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  }

  return (
    <div className="mt-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={`Signature footer for ${accountEmail}`}
        className="flex items-center gap-1 text-[11px] underline-offset-2 hover:underline"
        style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
      >
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        Signature footer
      </button>

      {expanded && (
        <div
          role="region"
          aria-label={`Signature footer preview for ${accountEmail}`}
          className="rounded-sm p-3 mt-1.5 flex flex-col gap-2"
          style={{ border: '1px solid var(--color-border)', background: 'var(--surface-elevated)' }}
        >
          <div>
            <label
              className="block text-[11px] mb-0.5"
              style={{ color: 'var(--color-text-disabled)' }}
              htmlFor={`signature-slogan-${accountEmail}`}
            >
              Slogan — proposed, edit before use
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`signature-slogan-${accountEmail}`}
                aria-label={`Signature slogan for ${accountEmail} (proposed — edit before use)`}
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="flex-1 rounded-sm px-2 h-8 text-[12px] focus:outline-hidden"
                style={fieldStyle}
              />
              <button
                type="button"
                onClick={() => void loadPreview(slogan)}
                aria-label={`Update signature preview for ${accountEmail}`}
                className="px-2 h-8 rounded-sm text-[11px] font-medium shrink-0"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-label={`Save signature slogan for ${accountEmail}`}
                className="px-2 h-8 rounded-sm text-[11px] font-medium shrink-0 disabled:opacity-50"
                style={{ background: '#16a34a18', color: '#15803d', border: '1px solid #16a34a30', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
              Loading…
            </p>
          ) : html ? (
            <div
              aria-label={`Rendered signature for ${accountEmail}`}
              className="rounded-sm p-3 overflow-x-auto"
              style={{ border: '1px solid var(--color-border)', background: '#ffffff' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
              {note ?? 'Signatures apply to business accounts only.'}
            </p>
          )}

          {error && (
            <p role="alert" className="text-[11px]" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}
          <span aria-live="polite" className="sr-only">
            {status}
          </span>
        </div>
      )}
    </div>
  )
}
