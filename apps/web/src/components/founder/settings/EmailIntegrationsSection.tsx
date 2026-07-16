// src/components/founder/settings/EmailIntegrationsSection.tsx
// Settings → Integrations — Email accounts.
// Lets the founder connect and manage MULTIPLE Gmail/Outlook mailboxes per
// provider: every connected account is listed with its status, a per-account
// Reconnect (re-run OAuth) and Disconnect action, plus a clear "Add another
// account" affordance (UNI-2153).
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, Link2, Plus } from 'lucide-react'

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

  const handleDisconnect = useCallback(
    async (service: ProviderService, email: string) => {
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
      } finally {
        setDisconnecting(null)
      }
    },
    [load],
  )

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
        <p role="alert" className="text-[13px] mb-3" style={{ color: 'var(--color-danger)' }}>
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
            onDisconnect={handleDisconnect}
          />
          <ProviderRow
            name="Microsoft"
            service="microsoft"
            configured={status.microsoft.configured}
            accounts={status.microsoft.accounts}
            emailToConnect={emailToConnect}
            disconnecting={disconnecting}
            onDisconnect={handleDisconnect}
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
  onDisconnect,
}: {
  name: string
  service: ProviderService
  configured: boolean
  accounts: ProviderAccount[]
  emailToConnect: string
  disconnecting: string | null
  onDisconnect: (service: ProviderService, email: string) => void
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
            return (
              <li key={account.email} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {account.email}
                </span>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="text-[11px] underline-offset-2 hover:underline"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Reconnect
                  </a>
                  <button
                    type="button"
                    onClick={() => onDisconnect(service, account.email)}
                    disabled={isDisconnecting}
                    className="text-[11px] underline-offset-2 hover:underline disabled:opacity-50"
                    style={{ color: 'var(--color-danger)', cursor: isDisconnecting ? 'not-allowed' : 'pointer' }}
                  >
                    {isDisconnecting ? 'Removing…' : 'Disconnect'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
