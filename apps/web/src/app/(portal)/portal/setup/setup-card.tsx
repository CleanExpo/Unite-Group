'use client'

import { useState, type FormEvent } from 'react'

import { videoThumbnailUrl, videoWatchUrl, type ChecklistItem } from '@/lib/portal/setup/items'
import { itemDone } from '@/lib/portal/setup/readiness'
import type { Connection } from '@/lib/portal/setup/types'
import { NOTES_MAX, VALUE_MAX } from '@/lib/portal/setup/validate'

import u from '../changes/portal-ui.module.css'

import { markAccessGrantedAction, saveConnectionAction, type SetupFormState } from './actions'

const STATUS_TEXT: Record<Connection['status'], string> = {
  not_started: 'Not started',
  link_saved: 'Link saved',
  access_granted: 'Access added, we are checking',
  verified: 'Verified',
}

export function SetupCard({ item, connection }: { item: ChecklistItem; connection: Connection | null }) {
  const status = connection?.status ?? 'not_started'
  const done = itemDone(item.kind, status)
  const [state, setState] = useState<SetupFormState>(null)
  const [busy, setBusy] = useState(false)
  const id = `conn-${item.kind}`

  async function run(call: () => Promise<SetupFormState>) {
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

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void run(() => saveConnectionAction({ kind: item.kind, value: String(form.get('value') ?? ''), notes: String(form.get('notes') ?? '') }))
  }

  return (
    <article className={done ? `${u.card} ${u.cardDone}` : u.card} aria-labelledby={`${id}-title`}>
      <div className={u.itemHead}>
        <h2 id={`${id}-title`} className={u.panelTitle}>{item.title}</h2>
        <span className={done ? `${u.chip} ${u.chipActive}` : u.chip}>{STATUS_TEXT[status]}</span>
      </div>
      <p className={u.lede}>{item.why}</p>
      <ol className={u.steps}>
        {item.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {item.video && (
        <a className={u.videoLink} href={videoWatchUrl(item.video.id)} target="_blank" rel="noopener noreferrer">
          {/* YouTube's own still frame; a plain img keeps it a link, never an embedded player */}
          <img className={u.thumb} src={videoThumbnailUrl(item.video.id)} alt="" width={132} height={74} loading="lazy" />
          <span>Watch how: {item.video.title} (opens in a new tab)</span>
        </a>
      )}
      <form className={u.form} onSubmit={onSave}>
        <div>
          <label htmlFor={`${id}-value`} className={u.label}>{item.valueLabel}</label>
          <input id={`${id}-value`} name="value" type="text" inputMode="url" required maxLength={VALUE_MAX}
            defaultValue={connection?.value ?? ''} placeholder={item.placeholder} className={u.field} autoComplete="off" />
          {item.kind === 'gsc' && <p className={u.hint}>Or type it as sc-domain:yourbusiness.com.au</p>}
        </div>
        <div>
          <label htmlFor={`${id}-notes`} className={u.label}>Anything we should know? (optional)</label>
          <input id={`${id}-notes`} name="notes" type="text" maxLength={NOTES_MAX}
            defaultValue={connection?.notes ?? ''} className={u.field} autoComplete="off" />
        </div>
        <div className={u.actions}>
          <button type="submit" className={u.btnGhost} disabled={busy}>Save</button>
          {item.accessLabel && status === 'link_saved' && (
            <button type="button" className={u.btn} disabled={busy} onClick={() => run(() => markAccessGrantedAction(item.kind))}>
              {item.accessLabel}
            </button>
          )}
        </div>
      </form>
      <div aria-live="polite">
        {state && <p role={state.ok ? 'status' : 'alert'} className={state.ok ? u.ok : u.err}>{state.message}</p>}
      </div>
    </article>
  )
}
