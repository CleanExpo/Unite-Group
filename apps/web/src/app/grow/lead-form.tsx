'use client'

import { useState, type FormEvent } from 'react'

import { CollectionNotice } from '@/components/public/collection-notice'

import { GROW_PACKAGES } from './packages'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-[15px] text-stone-900 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20'
const label = 'mb-1.5 block text-[13px] font-medium text-stone-700'

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
      <div role="status" className="rounded-sm border border-green-700/30 bg-green-50 p-6 text-stone-800">
        <p className="text-lg font-semibold text-green-800">Thank you. We have your details and will reply by email.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="first_name" className={label}>Your name</label>
        <input id="first_name" name="first_name" required autoComplete="given-name" className={field} />
      </div>
      <div>
        <label htmlFor="company" className={label}>Business name</label>
        <input id="company" name="company" autoComplete="organization" className={field} />
      </div>
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
      </div>
      <div>
        <label htmlFor="phone" className={label}>Phone</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} />
      </div>
      <div>
        <label htmlFor="website" className={label}>Your website (if you have one)</label>
        <input id="website" name="website" inputMode="url" placeholder="yourbusiness.com.au" className={field} />
      </div>
      <div>
        <label htmlFor="package" className={label}>Interested in</label>
        <select id="package" name="package" defaultValue="" className={field}>
          <option value="">Not sure yet</option>
          {GROW_PACKAGES.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="message" className={label}>Anything we should know?</label>
        <textarea id="message" name="message" rows={3} className={field} />
      </div>
      <label className="flex items-start gap-2.5 text-[14px] text-stone-700 sm:col-span-2">
        <input type="checkbox" name="marketing_consent" className="mt-1 h-4 w-4 accent-green-700" />
        <span>Yes, Unite Group may email me marketing updates.</span>
      </label>
      <div className="sm:col-span-2">
        <CollectionNotice form="grow" tone="light" />
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="inline-flex min-h-12 items-center rounded-sm bg-green-700 px-7 text-[15px] font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Get my free audit'}
        </button>
        {status.kind === 'error' && (
          <p role="alert" className="mt-3 text-[14px] text-red-700">{status.message}</p>
        )}
      </div>
    </form>
  )
}
