'use client'

import { useId, useState, useTransition } from 'react'

import { respondToItemAction, type FormState } from './actions'
import s from './project.module.css'

/** Accept, or ask for changes with a note. Accepting confirms the requirement is met; it is not release approval. */
export function RespondControl({ itemId, currentState }: { itemId: string; currentState: string }) {
  const id = useId()
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState('')
  const [state, setState] = useState<FormState>(null)
  const [pending, start] = useTransition()

  const send = (verdict: 'accept' | 'request_changes') =>
    start(async () => setState(await respondToItemAction({ itemId, verdict, note, currentState })))

  if (state?.ok) return <p role="status" className={s.ok}>{state.message}</p>
  return (
    <div className={s.respond}>
      <p className={s.hint}>Accepting confirms this meets your requirement. Releasing it is a separate, approved step.</p>
      {!asking ? (
        <div className={s.row}>
          <button type="button" className={s.primary} disabled={pending} onClick={() => send('accept')}>Accept</button>
          <button type="button" className={s.secondary} disabled={pending} onClick={() => setAsking(true)}>Ask for changes</button>
        </div>
      ) : (
        <div>
          <label htmlFor={id} className={s.label}>What should change?</label>
          <textarea id={id} className={s.textarea} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className={s.row}>
            <button type="button" className={s.primary} disabled={pending || note.trim().length === 0} onClick={() => send('request_changes')}>Send changes</button>
            <button type="button" className={s.secondary} disabled={pending} onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      )}
      {state && !state.ok && <p role="alert" className={s.err}>{state.message}</p>}
    </div>
  )
}
