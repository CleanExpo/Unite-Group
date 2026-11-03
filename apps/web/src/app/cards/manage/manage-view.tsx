'use client'

import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from 'react'

import m from './manage.module.css'

type Staff = {
  id: string
  card_slug: string
  staff_name: string | null
  photo_url: string | null
  mobile: string | null
  status: 'active' | 'deactivated'
  rounds_included: number
  has_link: boolean
}
type OwnerView = { role: 'owner'; rounds_included: number; business: Record<string, string | null>; staff: Staff[]; issued_link?: string; issued_for?: string }
type StaffView = { role: 'staff'; business_name: string | null; card: Staff }
type View = OwnerView | StaffView

const BUSINESS_LABELS: Array<[string, string]> = [
  ['business_name', 'Business name'],
  ['logo_url', 'Logo link (https)'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['website', 'Website (https)'],
  ['address', 'Address'],
  ['offer', 'Offer'],
]
const STAFF_LABELS: Array<[string, string]> = [
  ['staff_name', 'Your name'],
  ['photo_url', 'Photo link (https)'],
  ['mobile', 'Mobile'],
]

function formFields(event: FormEvent<HTMLFormElement>): Record<string, string> {
  return Object.fromEntries([...new FormData(event.currentTarget).entries()].map(([k, v]) => [k, String(v)]))
}

/** What an owner sees: the business details, then every staff card with its link and deactivate buttons. */
function OwnerPanel({ view, call }: { view: OwnerView; call: (action: string, extra: Record<string, unknown>) => void }) {
  return (
    <>
      <h1 className={m.title}>Your Business Pack account</h1>
      <p className={m.note}>Includes {view.rounds_included} rounds of changes on your film. A change here reaches every staff card.</p>
      <form
        className={m.form}
        data-owner-form
        onSubmit={(e) => {
          e.preventDefault()
          call('update_business', { fields: formFields(e) })
        }}
      >
        {BUSINESS_LABELS.map(([name, label]) => (
          <label key={name} className={m.field}>
            {label}
            <input name={name} defaultValue={view.business[name] ?? ''} className={m.input} />
          </label>
        ))}
        <button type="submit" className={m.primary}>Save business details</button>
      </form>
      <h2 className={m.heading}>Staff cards</h2>
      {view.staff.length === 0 ? <p className={m.note}>No staff cards yet. Buy them on the order page with this account&rsquo;s email address.</p> : null}
      <ul className={m.list}>
        {view.staff.map((card) => (
          <li key={card.id} className={m.row} data-staff-card={card.status}>
            <div>
              <p className={m.rowName}>{card.staff_name ?? 'Not set up yet'}</p>
              <p className={m.note}>
                {card.status === 'active' ? `Active. Includes ${card.rounds_included} rounds of changes.` : 'Deactivated. A new staff member needs a new card.'}
                {card.status === 'active' && card.staff_name ? <> <a href={`/c/${card.card_slug}`}>View card</a></> : null}
              </p>
              {view.issued_for === card.id && view.issued_link ? (
                <p className={m.issued} data-issued-link>
                  Send this link to your staff member. It is shown only now: <code>{view.issued_link}</code>
                </p>
              ) : null}
            </div>
            {card.status === 'active' ? (
              <div className={m.rowActions}>
                <button type="button" className={m.secondary} onClick={() => call('issue_staff_link', { staff_id: card.id })}>
                  {card.has_link ? 'Replace link' : 'Make link'}
                </button>
                <button type="button" className={m.secondary} onClick={() => {
                  if (window.confirm('Deactivate this card? This cannot be undone. A new staff member needs a new card.')) call('deactivate_staff', { staff_id: card.id })
                }}>
                  Deactivate
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  )
}

/** What a staff member sees: only their own three fields. The business details are shown, not editable. */
function StaffPanel({ view, call }: { view: StaffView; call: (action: string, extra: Record<string, unknown>) => void }) {
  return (
    <>
      <h1 className={m.title}>Your staff card{view.business_name ? ` at ${view.business_name}` : ''}</h1>
      <p className={m.note}>Includes {view.card.rounds_included} rounds of changes. Your business details are set by the account owner.</p>
      <form
        className={m.form}
        data-staff-form
        onSubmit={(e) => {
          e.preventDefault()
          call('update_staff', { staff_id: view.card.id, fields: formFields(e) })
        }}
      >
        {STAFF_LABELS.map(([name, label]) => (
          <label key={name} className={m.field}>
            {label}
            <input name={name} defaultValue={(view.card as unknown as Record<string, string | null>)[name] ?? ''} className={m.input} />
          </label>
        ))}
        <button type="submit" className={m.primary}>Save my details</button>
      </form>
      {view.card.staff_name ? <p className={m.note}><a href={`/c/${view.card.card_slug}`}>View your card</a></p> : null}
    </>
  )
}

const subscribeNothing = () => () => {}
const tokenFromFragment = () => new URLSearchParams(window.location.hash.slice(1)).get('k')

export function ManageView() {
  const token = useSyncExternalStore(subscribeNothing, tokenFromFragment, () => undefined)
  const [view, setView] = useState<View | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const call = useCallback(async (key: string, action: string, extra: Record<string, unknown> = {}) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/cards/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: key, action, ...extra }),
      })
      const data = (await res.json().catch(() => null)) as (View & { error?: string }) | null
      if (!res.ok || !data) {
        setMessage(data?.error ?? 'Something went wrong. Please try again.')
        return
      }
      setView(data)
      if (action !== 'load') setMessage('Saved.')
    } catch {
      setMessage('Could not reach us. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    if (token) void call(token, 'load')
  }, [call, token])

  if (token === null) return <p className={m.note} role="alert">This page opens from your private link. Check your email, or ask the account owner for a new one.</p>

  const act = (action: string, extra: Record<string, unknown>) => {
    if (token) void call(token, action, extra)
  }
  return (
    <div className={m.panel} aria-busy={saving}>
      {message ? <p className={m.message} role="status">{message}</p> : null}
      {view?.role === 'owner' ? <OwnerPanel key={JSON.stringify(view.business)} view={view} call={act} /> : null}
      {view?.role === 'staff' ? <StaffPanel key={JSON.stringify(view.card)} view={view} call={act} /> : null}
      {!view && !message ? <p className={m.note}>Opening your card&hellip;</p> : null}
    </div>
  )
}
