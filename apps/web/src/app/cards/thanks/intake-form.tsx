'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'

import { CollectionNotice } from '@/components/public/collection-notice'

import f from '../order/enquiry-form.module.css'
import s from '../order/order.module.css'

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{1,200}$/
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const LOGO_MAX_BYTES = 5 * 1024 * 1024

type Params = Record<string, string | string[] | undefined>

/** The checkout session id from the page URL: ?session_id= (Stripe's redirect placeholder). A ?ref= label is ignored. */
export function checkoutSessionId(params: Params): string | null {
  const v = params.session_id
  return typeof v === 'string' && SESSION_ID.test(v) ? v : null
}

/** Null when the file is fine (or absent); otherwise the reason to show the buyer. */
export function checkLogoFile(file: File | null): string | null {
  if (!file || file.size === 0) return null
  if (!LOGO_TYPES.includes(file.type)) return 'Please choose a PNG, JPEG, WebP or SVG image.'
  if (file.size > LOGO_MAX_BYTES) return 'That logo is over 5 MB. Please choose a smaller file.'
  return null
}

/** The /api/cards/intake body. The logo file is deliberately not part of it. Exported so tests check the wire contract. */
export function buildIntakeBody(form: FormData, sessionId: string) {
  const value = (name: string) => String(form.get(name) ?? '').trim()
  return {
    session_id: sessionId,
    name: value('name'),
    business: value('business'),
    email: value('email'),
    where_met: value('where_met'),
  }
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

export function IntakeForm({ reference }: { reference: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [logoError, setLogoError] = useState<string | null>(null)

  function onLogo(event: ChangeEvent<HTMLInputElement>) {
    setLogoError(checkLogoFile(event.currentTarget.files?.[0] ?? null))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const logoProblem = checkLogoFile(form.get('logo') instanceof File ? (form.get('logo') as File) : null)
    if (logoProblem) {
      setLogoError(logoProblem)
      return
    }
    setStatus({ kind: 'sending' })
    try {
      // TODO(logo-upload): the chosen logo is validated here but NOT sent or stored. No public, size-limited,
      // virus-scanned upload path exists in this app yet (every storage write today is a signed-in founder
      // action). Until one does, the confirmation below tells the buyer we will ask for the logo by email.
      const res = await fetch('/api/cards/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildIntakeBody(form, reference)),
      })
      if (res.ok) {
        setStatus({ kind: 'sent' })
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setStatus({ kind: 'error', message: data?.error ?? 'Something went wrong. Please try again.' })
    } catch {
      setStatus({ kind: 'error', message: 'Could not reach us. Check your connection and try again.' })
    }
  }

  if (status.kind === 'sent') {
    return (
      <div role="status" className={f.sent}>
        <p className={f.sentTitle}>Got it, thank you.</p>
        <p className={f.sentBody}>We will email you shortly to collect your logo file and confirm the next step.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={f.form}>
      <div className={f.grid}>
        <div>
          <label htmlFor="name" className={f.label}>Your name</label>
          <input id="name" name="name" required maxLength={120} autoComplete="name" className={f.field} />
        </div>
        <div>
          <label htmlFor="business" className={f.label}>Business name</label>
          <input id="business" name="business" maxLength={120} autoComplete="organization" className={f.field} />
        </div>
        <div className={f.wide}>
          <label htmlFor="email" className={f.label}>Email</label>
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={f.field} />
        </div>
        <div className={f.wide}>
          <label htmlFor="logo" className={f.label}>Your logo (PNG, JPEG, WebP or SVG, up to 5 MB)</label>
          <input id="logo" name="logo" type="file" accept={LOGO_TYPES.join(',')} onChange={onLogo} className={f.field} />
          {logoError && <p role="alert" className={f.alert}>{logoError}</p>}
        </div>
        <div className={f.wide}>
          <label htmlFor="where_met" className={f.label}>Where did we meet? (optional)</label>
          <textarea id="where_met" name="where_met" rows={2} maxLength={500} className={f.field} />
        </div>
      </div>

      <CollectionNotice form="card-intake" tone="dark" />

      <div>
        <button type="submit" disabled={status.kind === 'sending'} className={s.primary}>
          {status.kind === 'sending' ? 'Sending…' : 'Send my details'}
        </button>
        {status.kind === 'error' && <p role="alert" className={f.alert}>{status.message}</p>}
      </div>
    </form>
  )
}
