// src/components/founder/settings/EmailIntegrationsSection.tsx
// Settings → Integrations — Email accounts.
// Lets the founder see connected Gmail/Outlook accounts and click "Connect"
// instead of hand-building the OAuth authorize URL (UNI-2153).
'use client'

import { useEffect, useState } from 'react'
import { Mail, Link2 } from 'lucide-react'

interface ProviderAccount {
  email: string
  label: string
  needsReauth?: boolean
}

interface IntegrationsStatus {
  google: { configured: boolean; accounts: ProviderAccount[] }
  microsoft: { configured: boolean; accounts: ProviderAccount[] }
}

interface Props {
  founderEmail: string | null
}

export function EmailIntegrationsSection({ founderEmail }: Props) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectEmail, setConnectEmail] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings/integrations')
        if (!res.ok) throw new Error('Failed to load integration status')
        const data = (await res.json()) as IntegrationsStatus
        setStatus(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load integration status')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (founderEmail) setConnectEmail((current) => current || founderEmail)
  }, [founderEmail])

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
        <p role="alert" className="text-[13px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      {status && (
        <div className="flex flex-col gap-4">
          <ProviderRow
            name="Google"
            configured={status.google.configured}
            accounts={status.google.accounts}
            authorizeHref={`/api/auth/google/authorize?email=${encodeURIComponent(emailToConnect)}`}
            disabled={!emailToConnect}
          />
          <ProviderRow
            name="Microsoft"
            configured={status.microsoft.configured}
            accounts={status.microsoft.accounts}
            authorizeHref={`/api/auth/microsoft/authorize?email=${encodeURIComponent(emailToConnect)}`}
            disabled={!emailToConnect}
          />

          <div>
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
  configured,
  accounts,
  authorizeHref,
  disabled,
}: {
  name: string
  configured: boolean
  accounts: ProviderAccount[]
  authorizeHref: string
  disabled: boolean
}) {
  const buttonDisabled = disabled || !configured
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
            Connect {name}
          </button>
        ) : (
          <a href={authorizeHref} className={buttonClassName} style={{ ...buttonStyle, cursor: 'pointer' }}>
            <Link2 size={12} strokeWidth={1.5} />
            Connect {name}
          </a>
        )}
      </div>

      {!configured && (
        <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
          {name} OAuth is not configured on this deployment.
        </p>
      )}

      {configured && accounts.length === 0 && (
        <p className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
          No {name} accounts connected yet.
        </p>
      )}

      {configured && accounts.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {accounts.map((account) => (
            <li key={account.email} className="flex items-center justify-between gap-2 text-[12px]">
              <span style={{ color: 'var(--color-text-secondary)' }}>{account.email}</span>
              {account.needsReauth && (
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#b45309' }}>
                  Needs re-authorisation
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
