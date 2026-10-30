'use client'

import '@/styles/public-tokens.css'

import { useState, type FormEvent } from 'react'

import { CollectionNotice } from '@/public/collection-notice'
import f from '@/app/grow/grow-form.module.css'

import { OFFER_ID } from './offer'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

/** Builds the /api/leads body. Exported for tests so the wire contract is checked, not paraphrased. */
export function buildTenClipsBody(form: FormData, source: string | null) {
  const value = (name: string) => String(form.get(name) ?? '').trim()
  const website = value('website')
  const notes = value('message')
  return {
    first_name: value('first_name'),
    email: value('email'),
    phone: value('phone') || undefined,
    company: value('company') || undefined,
    interests: OFFER_ID,
    message: [`Offer: ${OFFER_ID}`, website && `Website: ${website}`, notes].filter(Boolean).join('\n'),
    referral_source: source ? `video:${OFFER_ID}:${source.slice(0, 48)}` : `video:${OFFER_ID}`,
    marketing_consent: form.get('marketing_consent') === 'on',
    business_key: 'unite-smb',
  }
}

export function TenClipsForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus({ kind: 'sending' })
    const source = new URLSearchParams(window.location.search).get('src')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildTenClipsBody(new FormData(event.currentTarget), source)),
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
        <p className={f.sentBody}>We will email you to confirm your brief and how to pay. Nothing has been charged.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={f.form} data-offer={OFFER_ID}>
      <input type="hidden" name="offer" value={OFFER_ID} />
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
      <label className={`${f.wide} ${f.consent}`}>
        <input type="checkbox" name="marketing_consent" className={f.check} />
        <span>Yes, Unite Group may email me marketing updates. You can unsubscribe at any time.</span>
      </label>
      <div className={f.wide}>
        <CollectionNotice form="home" tone="dark" />
        <button type="submit" disabled={status.kind === 'sending'} className={f.submit}>
          {status.kind === 'sending' ? 'Sending…' : 'Send my request'}
        </button>
        {status.kind === 'error' && (
          <p role="alert" className={f.error}>{status.message}</p>
        )}
      </div>
    </form>
  )
}
