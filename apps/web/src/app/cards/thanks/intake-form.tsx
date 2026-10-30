'use client'

import { useState, type FormEvent } from 'react'

import { CollectionNotice } from '@/public/collection-notice'

import { EDITIONS } from '../editions'
import f from '../order/enquiry-form.module.css'
import s from '../order/order.module.css'

/** The /api/cards/intake body. No file goes with it: the buyer gives a link to their logo or replies to the receipt email. Exported so tests check the wire contract. */
export function buildIntakeBody(form: FormData, sessionId: string) {
  const value = (name: string) => String(form.get(name) ?? '').trim()
  return {
    session_id: sessionId,
    film: value('film'),
    name: value('name'),
    business: value('business'),
    email: value('email'),
    contact_details: value('contact_details'),
    logo_link: value('logo_link'),
    brief: value('brief'),
    where_met: value('where_met'),
  }
}

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

export function IntakeForm({ reference }: { reference: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus({ kind: 'sending' })
    try {
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
        <p className={f.sentBody}>We will use these to make your card. If you did not give a logo link, please reply to your payment receipt email with your logo attached.</p>
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
          <label htmlFor="film" className={f.label}>Which film did you choose?</label>
          <select id="film" name="film" required defaultValue="" className={f.field}>
            <option value="" disabled>Choose a film</option>
            {EDITIONS.map((e) => (
              <option key={e.name} value={e.name}>{e.label}</option>
            ))}
            <option value="made-for-you">Made for you (we make one for your business)</option>
          </select>
        </div>
        <div className={f.wide}>
          <label htmlFor="contact_details" className={f.label}>Contact details to show at the end of the film</label>
          <textarea id="contact_details" name="contact_details" required rows={3} maxLength={500} placeholder="Name, title, phone, email, website" className={f.field} />
        </div>
        <div className={f.wide}>
          <label htmlFor="logo_link" className={f.label}>Link to your logo (optional)</label>
          <input id="logo_link" name="logo_link" type="url" maxLength={500} placeholder="https://" className={f.field} />
          <p className={f.hint}>No link? Leave this blank and reply to your payment receipt email with your logo attached (PNG, SVG or JPEG).</p>
        </div>
        <div className={f.wide}>
          <label htmlFor="brief" className={f.label}>Made for you only: a short brief (optional)</label>
          <textarea id="brief" name="brief" rows={4} maxLength={1500} placeholder="What your business does, and the feel you want" className={f.field} />
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
