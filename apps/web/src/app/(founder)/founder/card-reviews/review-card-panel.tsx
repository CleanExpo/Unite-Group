'use client'

import { useState, type FormEvent } from 'react'

import { buildGoogleReviewUrl, PLACE_ID_FINDER_URL } from '@/lib/card/review-link'
import { buildRequestMessage, mailtoHref, requestReviewLink, smsHref } from '@/lib/card/review-message'
import type { OwnerCard } from '@/lib/card/review-owner'
import type { OwnerChannel } from '@/lib/card/review-request'

import { createReviewRequestAction, recordOptOutAction, savePlaceIdAction } from './actions'
import styles from './card-reviews.module.css'

const BASE_URL = 'https://unite-group.in'
export const CONSENT_LABEL = 'This customer agreed I can message them about this job'

type Ready = { message: string; sms: string | null; mailto: string | null }

/** Shown instead of a message when this customer was already asked today: one request per customer per day. */
export const DUPLICATE_NOTE = 'You already asked this customer today. We have not prepared another message.'

/** One card: its Google Place ID, and the "ask for a review" form. Nothing here sends a message. */
export function ReviewCardPanel({ card }: { card: OwnerCard }) {
  const [placeId, setPlaceId] = useState(card.placeId ?? '')
  const [savedPlaceId, setSavedPlaceId] = useState(card.placeId)
  const [placeMsg, setPlaceMsg] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [contact, setContact] = useState('')
  const [channel, setChannel] = useState<OwnerChannel>('owner_sms')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [ready, setReady] = useState<Ready | null>(null)
  const [duplicate, setDuplicate] = useState(false)

  const [stopContact, setStopContact] = useState('')
  const [stopMsg, setStopMsg] = useState<string | null>(null)

  const previewUrl = buildGoogleReviewUrl(savedPlaceId)
  const sender = card.displayName ?? 'us'

  async function onSavePlace(e: FormEvent) {
    e.preventDefault()
    setPlaceMsg(null)
    try {
      const r = await savePlaceIdAction(card.slug, placeId)
      if (r.ok) { setSavedPlaceId(r.placeId); setPlaceMsg(r.placeId ? 'Saved. Check the link below opens your own listing.' : 'Removed. The button is hidden.') }
      else setPlaceMsg(r.error)
    } catch { setPlaceMsg('could not save, check your connection') }
  }

  async function onAsk(e: FormEvent) {
    e.preventDefault()
    setAskError(null)
    setReady(null)
    setDuplicate(false)
    setBusy(true)
    try {
      const r = await createReviewRequestAction({ slug: card.slug, firstName, contact, channel, consent })
      if (!r.ok) { setAskError(r.error); return }
      // a repeat for the same customer today gets no new message and no send buttons
      if (r.duplicate) { setDuplicate(true); return }
      const message = buildRequestMessage({
        firstName: firstName.trim(), senderName: sender, businessName: card.businessName, link: requestReviewLink(BASE_URL, card.slug, r.requestId),
      })
      const to = contact.trim()
      setReady({
        message,
        sms: channel === 'owner_sms' ? smsHref(to.replace(/[\s()-]/g, ''), message) : null,
        mailto: channel === 'owner_email' ? mailtoHref(to, 'A quick favour', message) : null,
      })
    } catch {
      setAskError('could not prepare the message, check your connection')
    } finally {
      setBusy(false)
    }
  }

  async function onShare() {
    if (!ready) return
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ text: ready.message }) } catch { /* the owner closed the share sheet */ }
      return
    }
    try {
      await navigator.clipboard.writeText(ready.message)
      setAskError(null)
    } catch {
      setAskError('could not open sharing here: select the message above and copy it')
    }
  }

  async function onStop(e: FormEvent) {
    e.preventDefault()
    setStopMsg(null)
    try {
      const r = await recordOptOutAction(card.slug, stopContact)
      setStopMsg(r.ok ? 'Recorded. You will not be able to ask this customer again from this card.' : r.error)
      // a message prepared before the STOP must not stay sendable
      if (r.ok) { setStopContact(''); setReady(null); setDuplicate(false) }
    } catch { setStopMsg('could not record, check your connection') }
  }

  return (
    <section className={styles.panel} aria-label={`Reviews for ${card.slug}`}>
      <h2>{card.businessName ?? card.displayName ?? card.slug}</h2>

      <form className={styles.form} onSubmit={onSavePlace}>
        <label>
          Your Google Place ID
          <input name="placeId" value={placeId} onChange={(e) => setPlaceId(e.target.value)} maxLength={300} placeholder="ChIJ..." />
        </label>
        <p className={styles.note}>
          Not sure? Search your business on <a href={PLACE_ID_FINDER_URL} target="_blank" rel="noreferrer">Google&apos;s Place ID Finder</a> and copy the ID.
          Leave it blank to hide the button.
        </p>
        <div className={styles.row}><button className={styles.button} type="submit">Save</button></div>
        {placeMsg ? <p role="status">{placeMsg}</p> : null}
        {previewUrl ? (
          <p className={styles.note}>
            <a href={previewUrl} target="_blank" rel="noreferrer">Check this opens your listing</a>. Your card shows
            &ldquo;Leave us a Google review&rdquo; {card.published ? 'now' : 'once it is published'}.
          </p>
        ) : null}
      </form>

      {previewUrl ? (
        <form className={styles.form} onSubmit={onAsk}>
          <h3>Ask a customer for a review</h3>
          <label>
            Customer first name
            <input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} required />
          </label>
          <label>
            Their mobile or email
            <input name="contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={254} required />
          </label>
          <div className={styles.row} role="radiogroup" aria-label="How you will send it">
            {([['owner_sms', 'Text from my phone'], ['owner_email', 'Email from my account'], ['owner_share', 'Share another way']] as const).map(([v, label]) => (
              <label key={v} className={styles.consent}>
                <input type="radio" name="channel" value={v} checked={channel === v} onChange={() => setChannel(v)} /> {label}
              </label>
            ))}
          </div>
          <label className={styles.consent}>
            <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            {CONSENT_LABEL}
          </label>
          <p className={styles.note}>
            You send it, from your own number or email. We keep the first name, the time you ticked the box, and a
            scrambled copy of the contact so you never ask the same person twice in a day. We don&apos;t keep the number
            or email itself. Everyone gets the same message.
          </p>
          <div className={styles.row}><button className={styles.button} type="submit" disabled={busy}>Prepare message</button></div>
          {askError ? <p role="alert">{askError}</p> : null}
          {duplicate ? <p role="status" data-request-duplicate>{DUPLICATE_NOTE}</p> : null}
          {ready ? (
            <div className={styles.form} data-request-ready>
              <p className={styles.message}>{ready.message}</p>
              <div className={styles.row}>
                {ready.sms ? <a className={styles.button} href={ready.sms}>Open my texts</a> : null}
                {ready.mailto ? <a className={styles.button} href={ready.mailto}>Open my email</a> : null}
                <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={onShare}>Share or copy</button>
              </div>
            </div>
          ) : null}
        </form>
      ) : null}

      <form className={styles.form} onSubmit={onStop}>
        <h3>A customer replied STOP</h3>
        <label>
          Their mobile or email
          <input name="stopContact" value={stopContact} onChange={(e) => setStopContact(e.target.value)} maxLength={254} required />
        </label>
        <div className={styles.row}><button className={`${styles.button} ${styles.secondary}`} type="submit">Don&apos;t ask them again</button></div>
        {stopMsg ? <p role="status">{stopMsg}</p> : null}
      </form>
    </section>
  )
}
