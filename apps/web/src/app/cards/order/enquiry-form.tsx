'use client'

import { useState, type FormEvent } from 'react'

import { CollectionNotice } from '@/public/collection-notice'

import f from './enquiry-form.module.css'
import { ENQUIRY_FORM_ID } from './order-buy'
import s from './order.module.css'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

/** Builds the /api/leads body. Exported for tests so the wire contract is checked, not paraphrased. */
export function buildCardEnquiryBody(form: FormData, referrer: string | null) {
  const value = (name: string) => String(form.get(name) ?? '').trim()
  const website = value('website')
  const notes = value('message')
  const edition = value('edition')
  return {
    first_name: value('first_name'),
    email: value('email'),
    phone: value('phone') || undefined,
    company: value('company') || undefined,
    interests: edition ? `living-card:${edition}` : 'living-card',
    message: [website && `Website: ${website}`, notes].filter(Boolean).join('\n') || undefined,
    referral_source: referrer ? `cards:${referrer}` : 'cards',
    marketing_consent: form.get('marketing_consent') === 'on',
    business_key: 'unite-cards',
  }
}

/** The enquiry form. The edition radios live in the film strip and join this form by its id. */
export function CardEnquiryForm({ referrer }: { referrer: string | null }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildCardEnquiryBody(new FormData(event.currentTarget), referrer)),
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
        <p className={f.sentTitle}>Thanks, we have your request.</p>
        <p className={f.sentBody}>We will email you to talk through your card. Nothing has been charged.</p>
      </div>
    )
  }

  return (
    <form id={ENQUIRY_FORM_ID} onSubmit={onSubmit} className={f.form}>
      <div className={f.grid}>
        <div>
          <label htmlFor="first_name" className={f.label}>Your name</label>
          <input id="first_name" name="first_name" required autoComplete="given-name" className={f.field} />
        </div>
        <div>
          <label htmlFor="company" className={f.label}>Business name</label>
          <input id="company" name="company" autoComplete="organization" className={f.field} />
        </div>
        <div>
          <label htmlFor="email" className={f.label}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={f.field} />
        </div>
        <div>
          <label htmlFor="phone" className={f.label}>Phone</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={f.field} />
        </div>
        <div className={f.wide}>
          <label htmlFor="website" className={f.label}>Your website (if you have one)</label>
          <input id="website" name="website" inputMode="url" placeholder="yourbusiness.com.au" className={f.field} />
        </div>
        <div className={f.wide}>
          <label htmlFor="message" className={f.label}>Anything we should know?</label>
          <textarea id="message" name="message" rows={3} className={f.field} />
        </div>
      </div>

      <label className={f.consent}>
        <input type="checkbox" name="marketing_consent" className={f.check} />
        <span>Yes, Unite Group may email me marketing updates. You can unsubscribe at any time.</span>
      </label>

      <CollectionNotice form="card-enquiry" tone="dark" />

      <div>
        <button type="submit" disabled={status.kind === 'sending'} className={s.primary}>
          {status.kind === 'sending' ? 'Sending…' : 'Send my request'}
        </button>
        {status.kind === 'error' && (
          <p role="alert" className={f.alert}>{status.message}</p>
        )}
      </div>
    </form>
  )
}
