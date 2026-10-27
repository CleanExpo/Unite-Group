'use client'

import '@/styles/public-tokens.css'

import { useState, type FormEvent } from 'react'

import { CollectionNotice } from '@/components/public/collection-notice'

import f from './grow-form.module.css'
import { GROW_PACKAGES } from './packages'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

/** Builds the /api/leads body. Exported for tests so the wire contract is checked, not paraphrased. */
export function buildLeadBody(form: FormData, source: string | null) {
  const value = (name: string) => String(form.get(name) ?? '').trim()
  const website = value('website')
  const notes = value('message')
  return {
    first_name: value('first_name'),
    email: value('email'),
    phone: value('phone') || undefined,
    company: value('company') || undefined,
    interests: value('package') || undefined,
    message: [website && `Website: ${website}`, notes].filter(Boolean).join('\n') || undefined,
    referral_source: source ? `grow:${source.slice(0, 64)}` : 'grow',
    marketing_consent: form.get('marketing_consent') === 'on',
    business_key: 'unite-smb',
  }
}

export function LeadForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus({ kind: 'sending' })
    const source = new URLSearchParams(window.location.search).get('src')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildLeadBody(new FormData(event.currentTarget), source)),
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
        <p className={f.sentTitle}>Thanks, we have your details.</p>
        <p className={f.sentBody}>We will email you your free AI-visibility audit and the next steps.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={f.form}>
      <div>
        <label htmlFor="first_name" className={f.label}>
          Your name
        </label>
        <input id="first_name" name="first_name" required autoComplete="given-name" className={f.field} />
      </div>
      <div>
        <label htmlFor="company" className={f.label}>
          Business name
        </label>
        <input id="company" name="company" autoComplete="organization" className={f.field} />
      </div>
      <div>
        <label htmlFor="email" className={f.label}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={f.field} />
      </div>
      <div>
        <label htmlFor="phone" className={f.label}>
          Phone
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className={f.field} />
      </div>
      <div>
        <label htmlFor="website" className={f.label}>
          Your website (if you have one)
        </label>
        <input id="website" name="website" inputMode="url" placeholder="yourbusiness.com.au" className={f.field} />
      </div>
      <div>
        <label htmlFor="package" className={f.label}>
          Interested in
        </label>
        <select id="package" name="package" defaultValue="" className={f.field}>
          <option value="">Not sure yet</option>
          {GROW_PACKAGES.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name}
            </option>
          ))}
        </select>
      </div>
      <div className={f.wide}>
        <label htmlFor="message" className={f.label}>
          Anything we should know?
        </label>
        <textarea id="message" name="message" rows={3} className={f.field} />
      </div>
      <label className={`${f.wide} ${f.consent}`}>
        <input type="checkbox" name="marketing_consent" className={f.check} />
        <span>Yes, Unite Group may email me marketing updates. You can unsubscribe at any time.</span>
      </label>
      <div className={f.wide}>
        <CollectionNotice form="grow" tone="dark" />
        <button type="submit" disabled={status.kind === 'sending'} className={f.submit}>
          {status.kind === 'sending' ? 'Sending…' : 'Get my free audit'}
        </button>
        {status.kind === 'error' && (
          <p role="alert" className={f.error}>
            {status.message}
          </p>
        )}
      </div>
    </form>
  )
}
