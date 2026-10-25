'use client'

import { useState, type FormEvent } from 'react'

import { submitEnquiryAction } from './actions'
import styles from './card.module.css'

export interface FallbackContact {
  phone: string | null
  email: string | null
}

type View = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string } | { kind: 'received'; reference: string }

/**
 * One enquiry. The reference number is shown only from a stored-row result; a failed or thrown call keeps what the
 * visitor typed and shows an error, never a receipt.
 */
export function EnquiryForm({ slug, fallback }: { slug: string; fallback?: FallbackContact }) {
  const [view, setView] = useState<View>({ kind: 'idle' })
  const [firstName, setFirstName] = useState('')
  const [ask, setAsk] = useState('')
  const [replyEmail, setReplyEmail] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setView({ kind: 'sending' })
    try {
      const r = await submitEnquiryAction(slug, { firstName, ask, replyEmail: replyEmail || null })
      setView(r.ok ? { kind: 'received', reference: r.receipt.reference } : { kind: 'error', message: r.error })
    } catch {
      setView({ kind: 'error', message: 'could not send, check your connection and try again' })
    }
  }

  if (view.kind === 'received') {
    return (
      <div className={styles.receipt} role="status">
        <p>Saved. Reference: {view.reference}</p>
        <p>
          Next step: your enquiry is stored. We are building the owner inbox, so the business is not notified yet. For a
          faster answer use Call or Email above and quote this reference; use the same way to correct anything you sent.
        </p>
      </div>
    )
  }
  const telHref = fallback?.phone ? `tel:${fallback.phone.replace(/[^+\d]/g, '')}` : null
  return (
    <form className={styles.enquiry} onSubmit={onSubmit}>
      <label>
        Your first name
        <input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} required />
      </label>
      <label>
        What do you need?
        <textarea name="ask" value={ask} onChange={(e) => setAsk(e.target.value)} maxLength={2000} required />
      </label>
      <label>
        Reply email (optional)
        <input name="replyEmail" type="email" value={replyEmail} onChange={(e) => setReplyEmail(e.target.value)} maxLength={254} />
      </label>
      {view.kind === 'sending' ? <p role="status">Sending…</p> : null}
      {view.kind === 'error' ? (
        <div role="alert">
          <p>{view.message}</p>
          {telHref || fallback?.email ? (
            <p>
              Your enquiry was not saved. You can still reach the business directly:{' '}
              {telHref ? <a href={telHref}>Call</a> : null}
              {telHref && fallback?.email ? ' or ' : null}
              {fallback?.email ? <a href={`mailto:${fallback.email}`}>Email</a> : null}
            </p>
          ) : null}
        </div>
      ) : null}
      <button type="submit" disabled={view.kind === 'sending'}>Send enquiry</button>
    </form>
  )
}
