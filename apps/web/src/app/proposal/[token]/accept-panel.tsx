'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import s from './proposal.module.css'

const MESSAGES: Record<string, string> = {
  invalid_code: 'That code did not work. Please check it, or talk to your Unite Group contact.',
  payment_off: 'Online payment is not switched on yet. Please talk to your Unite Group contact.',
  payment_pending: 'Your payment went through and we are waiting for Stripe to confirm it. Please refresh this page shortly. You do not need to pay again.',
  closed: 'This proposal is no longer open. Please refresh the page.',
  already_ordered: 'This proposal has already been accepted. Please refresh the page.',
}
const FALLBACK = 'Something went wrong on our side and nothing has been charged. Please try again in a few minutes.'

export function AcceptPanel({ token, defaultName, defaultEmail }: { token: string; defaultName: string; defaultEmail: string }) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [haveCode, setHaveCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function post(path: string, body: object): Promise<{ url?: string; redeemed?: boolean } | null> {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/proposals/${token}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) return json
      setMessage(MESSAGES[json.error] ?? FALLBACK)
    } catch {
      setMessage(FALLBACK)
    }
    setBusy(false)
    return null
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (haveCode) {
      const done = await post('redeem', { name, email, code, acceptedTerms: agreed })
      if (done?.redeemed) router.refresh()
      return
    }
    const done = await post('checkout', { name, acceptedTerms: agreed })
    if (done?.url) window.location.assign(done.url)
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <label className={s.field}>
        Your name
        <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} autoComplete="name" />
      </label>

      {haveCode ? (
        <>
          <label className={s.field}>
            Your email
            <input className={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" />
          </label>
          <label className={s.field}>
            Your code
            <input className={s.input} value={code} onChange={(e) => setCode(e.target.value)} required maxLength={64} autoComplete="off" spellCheck={false} />
          </label>
        </>
      ) : null}

      <label className={s.agree}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
        <span>I have read the proposal and agree to the terms.</span>
      </label>

      <button className={s.primary} type="submit" disabled={busy}>
        {busy ? 'One moment' : haveCode ? 'Accept with my code' : 'Accept and pay'}
      </button>

      <button className={s.textButton} type="button" onClick={() => { setHaveCode(!haveCode); setMessage(null) }}>
        {haveCode ? 'Pay by card instead' : 'I have a code'}
      </button>

      {message ? <p className={s.error} role="alert">{message}</p> : null}
    </form>
  )
}
