'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import type { InviteRow, InviteStatus } from '@/lib/portal/invites/founder'
import { DEFAULT_EXPIRY_DAYS, MAX_EXPIRY_DAYS } from '@/lib/portal/invites/limits'

import { createInviteAction, revokeInviteAction } from './actions'
import styles from './portal-invites.module.css'

const STATUS_LABEL: Record<InviteStatus, string> = {
  active: 'Ready to use',
  used: 'Used',
  revoked: 'Cancelled',
  expired: 'Expired',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Australia/Brisbane' })
}

/** The make-a-code form, the one-time code display, and the list of codes. */
export function InvitePanel({ invites, readError }: { invites: InviteRow[] | null; readError: string | null }) {
  const router = useRouter()
  const [tenantSlug, setTenantSlug] = useState('')
  const [boundEmail, setBoundEmail] = useState('')
  const [expiryDays, setExpiryDays] = useState(String(DEFAULT_EXPIRY_DAYS))
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [made, setMade] = useState<{ code: string; tenantSlug: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const joinLink = made ? `${window.location.origin}/portal/join?code=${encodeURIComponent(made.code)}` : ''

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setMade(null)
    setCopied(false)
    setBusy(true)
    try {
      const r = await createInviteAction({ tenantSlug, boundEmail: boundEmail || null, expiryDays: Number(expiryDays) })
      if (!r.ok) { setFormError(r.error); return }
      setMade({ code: r.code, tenantSlug: r.invite.tenantSlug })
      setBoundEmail('')
      router.refresh()
    } catch {
      setFormError('Could not make the code, check your connection. Nothing was saved.')
    } finally {
      setBusy(false)
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(joinLink)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function onRevoke(id: string) {
    setListError(null)
    try {
      const r = await revokeInviteAction(id)
      if (!r.ok) setListError(r.error)
      else router.refresh()
    } catch {
      setListError('Could not cancel the code, check your connection.')
    }
  }

  return (
    <>
      <section className={styles.panel} aria-labelledby="make-code">
        <h2 id="make-code">Make a code</h2>
        <form className={styles.form} onSubmit={onCreate}>
          <label>
            Business short name
            <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="brii" required autoComplete="off" />
          </label>
          <label>
            Owner&apos;s email (optional: the code then works only for this email)
            <input type="email" value={boundEmail} onChange={(e) => setBoundEmail(e.target.value)} autoComplete="off" />
          </label>
          <label>
            Days until it expires
            <input type="number" min={1} max={MAX_EXPIRY_DAYS} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} required />
          </label>
          <div className={styles.row}>
            <button type="submit" className={styles.button} disabled={busy}>{busy ? 'Making…' : 'Make code'}</button>
          </div>
          {formError && <p role="alert" className={styles.error}>{formError}</p>}
        </form>
        {made && (
          <div className={styles.made} role="status">
            <p className={styles.madeTitle}>Code for {made.tenantSlug}. Copy it now: it will not be shown again.</p>
            <p className={styles.code} data-testid="invite-code">{made.code}</p>
            <p className={styles.link}>{joinLink}</p>
            <div className={styles.row}>
              <button type="button" className={styles.button} onClick={onCopy}>{copied ? 'Copied' : 'Copy invite link'}</button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="all-codes">
        <h2 id="all-codes">All codes</h2>
        {readError ? (
          <p role="alert" className={styles.error}>Not available: {readError}.</p>
        ) : !invites || invites.length === 0 ? (
          <p className={styles.note}>No codes yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr><th>Business</th><th>Ends in</th><th>For email</th><th>Expires</th><th>Status</th><th><span className={styles.hidden}>Action</span></th></tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.tenantSlug}</td>
                  <td className={styles.mono}>…{invite.hint}</td>
                  <td>{invite.boundEmail ?? 'Anyone'}</td>
                  <td>{formatDate(invite.expiresAt)}</td>
                  <td>{STATUS_LABEL[invite.status]}</td>
                  <td>
                    {invite.status === 'active' && (
                      <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => onRevoke(invite.id)}
                        aria-label={`Cancel code ending ${invite.hint} for ${invite.tenantSlug}`}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {listError && <p role="alert" className={styles.error}>{listError}</p>}
      </section>
    </>
  )
}
