'use client'

import { useId, useState, useTransition } from 'react'

import type { ClientVerdict } from '@/lib/portal/projects/state'

import { respondToItemAction, type FormState } from './actions'
import s from './project.module.css'

/**
 * The client's controls for one item. Which controls appear comes only from clientActions() (passed in as
 * `actions`), the same rule that puts the item under "Needs your decision". Accepting confirms the requirement
 * is met; it is not release approval. Answering replies to a question the team asked.
 */
export function RespondControl({ itemId, currentState, waitingOn, actions }: {
  itemId: string; currentState: string; waitingOn: string; actions: readonly ClientVerdict[]
}) {
  const id = useId()
  const [writing, setWriting] = useState(false)
  const [note, setNote] = useState('')
  const [state, setState] = useState<FormState>(null)
  const [pending, start] = useTransition()

  const send = (verdict: ClientVerdict) =>
    start(async () => setState(await respondToItemAction({ itemId, verdict, note, currentState, waitingOn })))

  if (actions.length === 0) return null
  if (state?.ok) return <p role="status" className={s.ok}>{state.message}</p>

  const answering = actions.includes('answer')
  const noteVerdict: ClientVerdict = answering ? 'answer' : 'request_changes'
  return (
    <div className={s.respond}>
      <p className={s.hint}>
        {answering
          ? 'We asked you a question about this. Your answer goes straight to the team.'
          : 'Accepting confirms this meets your requirement. Releasing it is a separate, approved step.'}
      </p>
      {!writing && !answering ? (
        <div className={s.row}>
          {actions.includes('accept') && (
            <button type="button" className={s.primary} disabled={pending} onClick={() => send('accept')}>Accept</button>
          )}
          {actions.includes('request_changes') && (
            <button type="button" className={s.secondary} disabled={pending} onClick={() => setWriting(true)}>Ask for changes</button>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor={id} className={s.label}>{answering ? 'Your answer' : 'What should change?'}</label>
          <textarea id={id} className={s.textarea} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className={s.row}>
            <button type="button" className={s.primary} disabled={pending || note.trim().length === 0} onClick={() => send(noteVerdict)}>
              {answering ? 'Send answer' : 'Send changes'}
            </button>
            {!answering && <button type="button" className={s.secondary} disabled={pending} onClick={() => setWriting(false)}>Cancel</button>}
          </div>
        </div>
      )}
      {state && !state.ok && <p role="alert" className={s.err}>{state.message}</p>}
    </div>
  )
}
