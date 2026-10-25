'use client'

import { useState, type FormEvent } from 'react'

import { CollectionNotice } from '@/components/public/collection-notice'
import { CARD_TIERS } from '@/app/cards/order/order-view'
import { formatAud } from '@/app/grow/packages'
import { CONTACT_EMAIL } from '@/lib/public-site'

import s from './public.module.css'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

export const INTEREST_OPTIONS = [
  ...CARD_TIERS.map((t) => `Video business card, ${t.name} (${formatAud(t.priceAud)})`),
  'Something else',
] as const

/** The /api/leads body, same fields and business_key as the /grow form. Exported so a test checks the wire contract. */
export function buildHomeLeadBody(form: FormData) {
  const value = (name: string) => String(form.get(name) ?? '').trim()
  return {
    first_name: value('first_name'),
    email: value('email'),
    phone: value('phone') || undefined,
    interests: value('interest') || undefined,
    message: value('message') || undefined,
    referral_source: 'home',
    marketing_consent: form.get('marketing_consent') === 'on',
    business_key: 'unite-smb',
  }
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus({ kind: 'sending' })
    const fail = `Something went wrong. Please email ${CONTACT_EMAIL} instead.`
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildHomeLeadBody(new FormData(event.currentTarget))),
      })
      if (res.ok) {
        setStatus({ kind: 'sent' })
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setStatus({ kind: 'error', message: `${data?.error ?? fail} You can also email ${CONTACT_EMAIL}.` })
    } catch {
      setStatus({ kind: 'error', message: `Could not reach us. Check your connection, or email ${CONTACT_EMAIL}.` })
    }
  }

  if (status.kind === 'sent') {
    return (
      <div role="status" className={s.thanks}>
        <p>Thanks, we have your details. We will reply by email.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={s.form}>
      <div className={s.formGrid}>
        <div>
          <label htmlFor="first_name" className={s.label}>
            Your name
          </label>
          <input id="first_name" name="first_name" required autoComplete="given-name" className={s.field} />
        </div>
        <div>
          <label htmlFor="email" className={s.label}>
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={s.field} />
        </div>
        <div>
          <label htmlFor="phone" className={s.label}>
            Phone (optional)
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={s.field} />
        </div>
        <div>
          <label htmlFor="interest" className={s.label}>
            Interested in
          </label>
          <select id="interest" name="interest" defaultValue="" className={s.field}>
            <option value="">Not sure yet</option>
            {INTEREST_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className={s.wide}>
          <label htmlFor="message" className={s.label}>
            Your question
          </label>
          <textarea id="message" name="message" rows={4} className={s.field} />
        </div>
      </div>
      <label className={s.consent}>
        <input type="checkbox" name="marketing_consent" />
        <span>Yes, Unite Group may email me marketing updates. You can unsubscribe at any time.</span>
      </label>
      <div>
        <CollectionNotice form="home" tone="dark" />
        <button type="submit" disabled={status.kind === 'sending'} className={s.buttonPrimary}>
          {status.kind === 'sending' ? 'Sending...' : 'Send your question'}
        </button>
        {status.kind === 'error' && (
          <p role="alert" className={s.error}>
            {status.message}
          </p>
        )}
      </div>
    </form>
  )
}
