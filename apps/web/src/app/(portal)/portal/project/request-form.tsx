'use client'

import { useId, useState, useTransition } from 'react'

import { submitProjectRequestAction, type FormState } from './actions'
import s from './project.module.css'

function newKey(): string {
  return `req-${crypto.randomUUID()}`
}

/** One idempotency key per request: a double click or a retry after a network error cannot make a second item. */
export function RequestForm({ projectSlug }: { projectSlug: string }) {
  const id = useId()
  const [text, setText] = useState('')
  const [key, setKey] = useState(newKey)
  const [state, setState] = useState<FormState>(null)
  const [pending, start] = useTransition()

  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const result = await submitProjectRequestAction({ projectSlug, text, idempotencyKey: key })
          setState(result)
          if (result?.ok) { setText(''); setKey(newKey()) }
        })
      }}
    >
      <label htmlFor={id} className={s.label}>What do you need?</label>
      <p className={s.hint}>Describe the outcome you want in your own words. We keep your exact wording with the request.</p>
      <textarea id={id} className={s.textarea} rows={4} maxLength={4000} value={text}
        onChange={(e) => setText(e.target.value)} required minLength={5} />
      <button type="submit" className={s.primary} disabled={pending || text.trim().length < 5}>
        {pending ? 'Sending...' : 'Send request'}
      </button>
      {state && <p role={state.ok ? 'status' : 'alert'} className={state.ok ? s.ok : s.err}>{state.message}</p>}
    </form>
  )
}
