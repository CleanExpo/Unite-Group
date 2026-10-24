'use client'

import { useState, type FormEvent } from 'react'

import { submitEnquiryAction } from './actions'
import styles from './card.module.css'

type View = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string } | { kind: 'received'; id: string }

/**
 * One enquiry. The reference number is shown only from a stored-row result; a failed or thrown call keeps what the
 * visitor typed and shows an error, never a receipt.
 */
export function EnquiryForm({ slug }: { slug: string }) {
  const [view, setView] = useState<View>({ kind: 'idle' })
  const [firstName, setFirstName] = useState('')
  const [ask, setAsk] = useState('')
  const [replyEmail, setReplyEmail] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setView({ kind: 'sending' })
    try {
      const r = await submitEnquiryAction(slug, { firstName, ask, replyEmail: replyEmail || null })
      setView(r.ok ? { kind: 'received', id: r.receipt.id } : { kind: 'error', message: r.error })
    } catch {
      setView({ kind: 'error', message: 'could not send, check your connection and try again' })
    }
  }

  if (view.kind === 'received') {
    return <p className={styles.receipt}>Enquiry received. Reference: {view.id}</p>
  }
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
      {view.kind === 'error' ? <p role="alert">{view.message}</p> : null}
      <button type="submit" disabled={view.kind === 'sending'}>Send enquiry</button>
    </form>
  )
}
