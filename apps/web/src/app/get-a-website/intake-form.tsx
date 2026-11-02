'use client'

import '@/styles/public-tokens.css'

import { useState, type FormEvent } from 'react'

import { CollectionNotice } from '@/public/collection-notice'
import f from '@/app/grow/grow-form.module.css'

import { BUDGET_BANDS, CALL_TIMES, INTAKE_SOURCE, OFFER_ID, PHOTO_OPTIONS, THANKS_PATH, TIMELINES } from './offer'
import s from './get-a-website.module.css'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string }

/** Builds the /api/leads body. Exported for tests so the wire contract is checked, not paraphrased. */
export function buildIntakeBody(form: FormData, referrer: string | null) {
  const value = (name: string) => String(form.get(name) ?? '').trim()
  const intake = {
    current_site: value('current_site'),
    services: value('services'),
    goals: value('goals'),
    photos: value('photos'),
    photos_link: value('photos_link'),
    socials: value('socials'),
    budget_band: value('budget_band'),
    timeline: value('timeline'),
    call_time: value('call_time'),
  }
  const summary = [
    `Offer: ${OFFER_ID}`,
    intake.current_site && `Current website: ${intake.current_site}`,
    intake.services && `Services: ${intake.services}`,
    intake.goals && `Goals: ${intake.goals}`,
    intake.photos && `Photos: ${intake.photos}`,
    intake.photos_link && `Photos link: ${intake.photos_link}`,
    intake.socials && `Socials: ${intake.socials}`,
    intake.budget_band && `Budget: ${intake.budget_band}`,
    intake.timeline && `Timeline: ${intake.timeline}`,
    intake.call_time && `Call: ${intake.call_time}`,
  ]
  return {
    source: INTAKE_SOURCE,
    first_name: value('first_name'),
    email: value('email'),
    phone: value('phone') || undefined,
    company: value('company'),
    interests: OFFER_ID,
    message: summary.filter(Boolean).join('\n'),
    referral_source: referrer ? `${OFFER_ID}:${referrer.slice(0, 48)}` : OFFER_ID,
    contact_consent: form.get('contact_consent') === 'on',
    marketing_consent: form.get('marketing_consent') === 'on',
    business_key: 'unite-smb',
    intake,
  }
}

function Choice({ name, label, options }: { name: string; label: string; options: readonly string[] }) {
  return (
    <div>
      <label htmlFor={name} className={f.label}>{label}</label>
      <select id={name} name={name} required defaultValue="" className={f.field}>
        <option value="" disabled>Choose one</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

export function IntakeForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status.kind === 'sending') return
    setStatus({ kind: 'sending' })
    const referrer = new URLSearchParams(window.location.search).get('src')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildIntakeBody(new FormData(event.currentTarget), referrer)),
      })
      if (res.ok) {
        // Stays in 'sending' so the button cannot post the form twice while the next page loads.
        window.location.assign(THANKS_PATH)
        return
      }
      // A 400 explains what to fix. Anything else is our fault, so the visitor gets plain words, not a server message.
      const data = res.status === 400 ? ((await res.json().catch(() => null)) as { error?: string } | null) : null
      setStatus({ kind: 'error', message: data?.error ?? 'Something went wrong on our side and your answers were not saved. Please try again.' })
    } catch {
      setStatus({ kind: 'error', message: 'Could not reach us. Check your connection and try again.' })
    }
  }

  return (
    <form onSubmit={onSubmit} className={f.form} data-offer={OFFER_ID}>
      <h3 className={`${f.wide} ${s.formHeading}`}>Your business</h3>
      <div>
        <label htmlFor="first_name" className={f.label}>Your name</label>
        <input id="first_name" name="first_name" required maxLength={256} autoComplete="given-name" className={f.field} />
      </div>
      <div>
        <label htmlFor="company" className={f.label}>Business name</label>
        <input id="company" name="company" required maxLength={256} autoComplete="organization" className={f.field} />
      </div>
      <div>
        <label htmlFor="email" className={f.label}>Email</label>
        <input id="email" name="email" type="email" required maxLength={256} autoComplete="email" className={f.field} />
      </div>
      <div>
        <label htmlFor="phone" className={f.label}>Phone (optional)</label>
        <input id="phone" name="phone" type="tel" maxLength={256} autoComplete="tel" className={f.field} />
      </div>
      <div className={f.wide}>
        <label htmlFor="current_site" className={f.label}>Your current website (if you have one)</label>
        <input id="current_site" name="current_site" inputMode="url" maxLength={256} placeholder="yourbusiness.com.au" className={f.field} />
      </div>

      <h3 className={`${f.wide} ${s.formHeading}`}>What you need</h3>
      <div className={f.wide}>
        <label htmlFor="services" className={f.label}>What do you sell or offer?</label>
        <textarea id="services" name="services" required rows={3} maxLength={1500} className={f.field} />
      </div>
      <div className={f.wide}>
        <label htmlFor="goals" className={f.label}>What should the new website do for you?</label>
        <textarea id="goals" name="goals" required rows={3} maxLength={1500} placeholder="More bookings, more calls, look more professional" className={f.field} />
      </div>
      <Choice name="photos" label="Do you have photos of your business?" options={PHOTO_OPTIONS} />
      <div>
        <label htmlFor="photos_link" className={f.label}>Link to your photos (optional)</label>
        <input id="photos_link" name="photos_link" inputMode="url" maxLength={256} placeholder="A shared folder, such as Google Drive" className={f.field} />
      </div>
      <div className={f.wide}>
        <label htmlFor="socials" className={f.label}>Your social media pages (optional)</label>
        <input id="socials" name="socials" maxLength={256} placeholder="Facebook, Instagram, LinkedIn" className={f.field} />
      </div>

      <h3 className={`${f.wide} ${s.formHeading}`}>Budget and timing</h3>
      <Choice name="budget_band" label="Your budget" options={BUDGET_BANDS} />
      <Choice name="timeline" label="When do you want it live?" options={TIMELINES} />
      <div className={f.wide}>
        <Choice name="call_time" label="Would you like a call with us?" options={CALL_TIMES} />
      </div>

      <label className={`${f.wide} ${f.consent}`}>
        <input type="checkbox" name="contact_consent" required className={f.check} />
        <span>Yes, Unite Group may contact me about my website using the details above.</span>
      </label>
      <label className={`${f.wide} ${f.consent}`}>
        <input type="checkbox" name="marketing_consent" className={f.check} />
        <span>Also send me marketing updates (optional). You can unsubscribe at any time.</span>
      </label>
      <div className={f.wide}>
        <CollectionNotice form="home" tone="dark" />
        <button type="submit" disabled={status.kind === 'sending'} className={f.submit}>
          {status.kind === 'sending' ? 'Sending…' : 'Send my answers'}
        </button>
        {status.kind === 'error' && (
          <p role="alert" className={f.error}>{status.message}</p>
        )}
      </div>
    </form>
  )
}
