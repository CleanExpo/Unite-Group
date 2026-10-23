'use client'

import { useState, type FormEvent } from 'react'

import { EDITIONS } from '../editions'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

const field = 'w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-[15px] text-stone-900 outline-none focus:border-[#e55a2b] focus:ring-2 focus:ring-[#e55a2b]/20'
const label = 'mb-1.5 block text-[13px] font-medium text-stone-700'

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

export function CardEnquiryForm({ edition, referrer }: { edition: string | null; referrer: string | null }) {
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
      <div role="status" className="rounded-sm border border-[#e55a2b]/30 bg-[#fff4ef] p-6 text-stone-800">
        <p className="text-lg font-semibold text-[#b8431c]">Thanks, we have your request.</p>
        <p className="mt-2 text-[15px]">We will email you to talk through your card. Nothing has been charged.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <fieldset>
        <legend className={label}>Your opener</legend>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {EDITIONS.map((e) => (
            <label key={e.name} className="group relative grid cursor-pointer gap-1.5 text-center text-[12.5px] font-medium text-stone-700">
              <input
                type="radio"
                name="edition"
                value={e.name}
                defaultChecked={e.name === edition}
                className="peer absolute opacity-0"
              />
              <img
                src={e.pickerPoster ?? e.poster}
                alt=""
                loading="lazy"
                className="aspect-[9/16] w-full rounded-sm border-[3px] border-transparent bg-[#04080e] object-cover peer-checked:border-[#e55a2b] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-stone-900"
              />
              {e.label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-stone-500">
          {edition ? 'Preselected: the edition you just saw. You can change it.' : 'Not sure yet? Leave it blank and we will pick one with you.'}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="sm:col-span-2">
          <label htmlFor="website" className={label}>Your website (if you have one)</label>
          <input id="website" name="website" inputMode="url" placeholder="yourbusiness.com.au" className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className={label}>Anything we should know?</label>
          <textarea id="message" name="message" rows={3} className={field} />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-[14px] text-stone-700">
        <input type="checkbox" name="marketing_consent" className="mt-1 h-4 w-4 accent-[#e55a2b]" />
        <span>Yes, Unite Group may email me marketing updates. You can unsubscribe at any time.</span>
      </label>

      <div>
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="inline-flex min-h-12 items-center rounded-sm bg-[#e55a2b] px-7 text-[15px] font-semibold text-white hover:bg-[#cf4b1f] disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Send my request'}
        </button>
        {status.kind === 'error' && (
          <p role="alert" className="mt-3 text-[14px] text-red-700">{status.message}</p>
        )}
      </div>
    </form>
  )
}
