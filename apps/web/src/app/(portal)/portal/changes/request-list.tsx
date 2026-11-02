'use client'

import { useState } from 'react'

import { STATUS_LABEL, ownerCanDecide } from '@/lib/portal/changes/state'
import { CHANGE_PAGES, type ChangeRequest } from '@/lib/portal/changes/types'
import { EDIT_NOTE_MAX } from '@/lib/portal/changes/validate'

import { approveChangeAction, askForEditsAction, type FormState } from './actions'
import u from './portal-ui.module.css'

const PAGE_LABEL: Record<string, string> = Object.fromEntries(CHANGE_PAGES.map((p) => [p.value, p.label]))
const DATE = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Australia/Sydney' })

export function RequestList({ requests }: { requests: ChangeRequest[] }) {
  if (requests.length === 0) {
    return <p className={u.empty}>No requests yet. When you send one, it shows here with its progress.</p>
  }
  return (
    <ul className={u.list}>
      {requests.map((r) => <RequestItem key={r.id} request={r} />)}
    </ul>
  )
}

function RequestItem({ request }: { request: ChangeRequest }) {
  const waiting = ownerCanDecide(request.status)
  return (
    <li className={waiting ? `${u.item} ${u.itemWaiting}` : u.item}>
      <div className={u.itemHead}>
        <h3 className={u.itemTitle}>{PAGE_LABEL[request.page] ?? 'Your site'}</h3>
        <span className={waiting ? `${u.chip} ${u.chipActive}` : u.chip}>{STATUS_LABEL[request.status]}</span>
      </div>
      <p className={u.meta}>
        Sent {DATE.format(new Date(request.createdAt))}{request.photoPath ? ' · photo attached' : ''}
      </p>
      <p className={u.body}>{request.requestText}</p>
      {request.editNote && request.status === 'in_progress' && (
        <p className={u.meta}>Your note on the last preview: {request.editNote}</p>
      )}
      {request.previewUrl && (waiting || request.status === 'approved') && (
        <div className={`${u.actions} ${u.actionsTop}`}>
          <a className={u.btnGhost} href={request.previewUrl} target="_blank" rel="noopener noreferrer">Open the preview</a>
        </div>
      )}
      {waiting && <Decision requestId={request.id} />}
    </li>
  )
}

function Decision({ requestId }: { requestId: string }) {
  const [state, setState] = useState<FormState>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')

  async function run(call: () => Promise<FormState>) {
    setBusy(true)
    setState(null)
    try {
      setState(await call())
    } catch {
      setState({ ok: false, message: 'Could not reach us. Check your connection and try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={u.actionsTop}>
      {!editing ? (
        <div className={u.actions}>
          <button type="button" className={u.btn} disabled={busy} onClick={() => run(() => approveChangeAction(requestId))}>
            Approve
          </button>
          <button type="button" className={u.btnGhost} disabled={busy} onClick={() => setEditing(true)}>
            Ask for edits
          </button>
        </div>
      ) : (
        <form className={u.form} onSubmit={(e) => { e.preventDefault(); void run(() => askForEditsAction(requestId, note)) }}>
          <div>
            <label htmlFor={`note-${requestId}`} className={u.label}>What should we change in the preview?</label>
            <textarea id={`note-${requestId}`} className={u.field} rows={3} required maxLength={EDIT_NOTE_MAX}
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className={u.actions}>
            <button type="submit" className={u.btn} disabled={busy}>Send my edits</button>
            <button type="button" className={u.btnGhost} disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
      <div aria-live="polite" className={u.actionsTop}>
        {state && <p role={state.ok ? 'status' : 'alert'} className={state.ok ? u.ok : u.err}>{state.message}</p>}
      </div>
    </div>
  )
}
