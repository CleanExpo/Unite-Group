'use client'

import '@/styles/public-tokens.css'

import { useRef, useState, type FormEvent } from 'react'

import { trackSiteEvent } from '@/components/analytics/site-tracker'
import { CollectionNotice } from '@/public/collection-notice'
import f from '@/app/grow/grow-form.module.css'

import { buildBotLeadBody } from './lead-body'
import s from './bots.module.css'

type Turn = { role: 'user' | 'assistant'; content: string }
type Details = { name: string; email: string; phone: string; need: string }
type Mode = 'chat' | 'confirm' | 'form' | 'sent'

export const LEAD_CHAT_ENDPOINT = '/api/bots/lead-chat'

/** Funnel events, carried on the existing site analytics types (no new event type, no table change). */
export const FUNNEL = {
  chatStarted: { type: 'cta_click', label: 'bot_chat_started' },
  leadCaptured: { type: 'form_submit', label: 'lead_captured' },
} as const

export const GREETING = 'Hi, I am the Unite Group lead follow-up bot. What can we help your business with today?'

const EMPTY: Details = { name: '', email: '', phone: '', need: '' }

type ChatReply = { reply?: string; capture?: Details | null; turnsLeft?: number; error?: string; fallback?: string }

export function LeadDemo() {
  const [turns, setTurns] = useState<Turn[]>([{ role: 'assistant', content: GREETING }])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('chat')
  const [details, setDetails] = useState<Details>(EMPTY)
  const [turnsLeft, setTurnsLeft] = useState<number | null>(null)
  const started = useRef(false)

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    if (!started.current) {
      started.current = true
      trackSiteEvent(FUNNEL.chatStarted.type, FUNNEL.chatStarted.label)
    }
    const next: Turn[] = [...turns, { role: 'user', content: text }]
    setTurns(next)
    setDraft('')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(LEAD_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = ((await res.json().catch(() => null)) ?? {}) as ChatReply
      if (res.ok && data.reply) {
        setTurns([...next, { role: 'assistant', content: data.reply }])
        if (typeof data.turnsLeft === 'number') setTurnsLeft(data.turnsLeft)
        if (data.capture) {
          setDetails(data.capture)
          setMode('confirm')
        }
        return
      }
      if (data.fallback === 'form') {
        setDetails({ ...EMPTY, need: text })
        setMode('form')
        setError(data.error ?? null)
        return
      }
      setError(data.error ?? 'Something went wrong on our side. Please try again.')
    } catch {
      setError('Could not reach us. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'sent') {
    return (
      <div className={f.sent} role="status" data-bots-demo="sent">
        <p className={f.sentTitle}>Thanks, your details are with the Unite Group team.</p>
        <p className={f.sentBody}>That is the lead follow-up bot at work: your enquiry is now a lead in our inbox, ready for a call back.</p>
      </div>
    )
  }

  if (mode === 'confirm' || mode === 'form') {
    return (
      <div data-bots-demo={mode}>
        {mode === 'form' && error ? <p className={s.notice}>{error}</p> : null}
        {mode === 'confirm' ? <p className={s.notice}>Here is what the bot picked up. Check it, then send it through.</p> : null}
        <DetailsForm initial={details} via={mode === 'confirm' ? 'chat' : 'form'} onSent={() => setMode('sent')} />
        {mode === 'confirm' ? (
          <button type="button" className={s.linkButton} onClick={() => setMode('chat')}>
            Back to the chat
          </button>
        ) : null}
      </div>
    )
  }

  const limitReached = turnsLeft === 0

  return (
    <div className={s.chat} data-bots-demo="chat">
      <ol className={s.log} aria-live="polite" aria-label="Conversation with the lead follow-up bot">
        {turns.map((t, i) => (
          <li key={i} className={t.role === 'user' ? s.fromVisitor : s.fromBot}>
            <span className={s.who}>{t.role === 'user' ? 'You' : 'Bot'}</span>
            {t.content}
          </li>
        ))}
        {busy ? <li className={s.fromBot}><span className={s.who}>Bot</span>Typing...</li> : null}
      </ol>
      {error ? <p role="alert" className={f.error}>{error}</p> : null}
      {limitReached ? (
        <p className={s.notice}>This demo chat has reached its limit. You can send your details with the form.</p>
      ) : (
        <form onSubmit={send} className={s.composer}>
          <label htmlFor="bots-chat-input" className={s.srOnly}>Your message</label>
          <input
            id="bots-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={600}
            autoComplete="off"
            placeholder="Type your message"
            className={f.field}
            disabled={busy}
          />
          <button type="submit" className={s.sendButton} disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>
      )}
      <p className={s.small}>
        This is a live demo answered by an AI model. Please do not share anything sensitive.{' '}
        <button type="button" className={s.linkButton} onClick={() => setMode('form')}>
          Prefer a form?
        </button>
      </p>
    </div>
  )
}

function DetailsForm({ initial, via, onSent }: { initial: Details; via: 'chat' | 'form'; onSent: () => void }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const form = new FormData(event.currentTarget)
    const value = (k: string) => String(form.get(k) ?? '').trim()
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          buildBotLeadBody({
            name: value('name'),
            email: value('email'),
            phone: value('phone'),
            need: value('need'),
            marketingConsent: form.get('marketing_consent') === 'on',
            via,
          }),
        ),
      })
      if (res.ok) {
        trackSiteEvent(FUNNEL.leadCaptured.type, FUNNEL.leadCaptured.label)
        onSent()
        return
      }
      const data = res.status === 400 ? ((await res.json().catch(() => null)) as { error?: string } | null) : null
      setError(data?.error ?? 'Something went wrong on our side and your details were not saved. Please try again.')
    } catch {
      setError('Could not reach us. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className={f.form}>
      <div>
        <label htmlFor="bots-name" className={f.label}>Your name</label>
        <input id="bots-name" name="name" required maxLength={256} autoComplete="name" defaultValue={initial.name} className={f.field} />
      </div>
      <div>
        <label htmlFor="bots-email" className={f.label}>Email</label>
        <input id="bots-email" name="email" type="email" required maxLength={256} autoComplete="email" defaultValue={initial.email} className={f.field} />
      </div>
      <div>
        <label htmlFor="bots-phone" className={f.label}>Phone (optional)</label>
        <input id="bots-phone" name="phone" type="tel" maxLength={64} autoComplete="tel" defaultValue={initial.phone} className={f.field} />
      </div>
      <div className={f.wide}>
        <label htmlFor="bots-need" className={f.label}>What do you need help with?</label>
        <textarea id="bots-need" name="need" required rows={3} maxLength={1000} defaultValue={initial.need} className={f.field} />
      </div>
      <label className={`${f.wide} ${f.consent}`}>
        <input type="checkbox" name="contact_consent" required className={f.check} />
        <span>Yes, Unite Group may contact me about my enquiry using the details above.</span>
      </label>
      <label className={`${f.wide} ${f.consent}`}>
        <input type="checkbox" name="marketing_consent" className={f.check} />
        <span>Also send me marketing updates (optional). You can unsubscribe at any time.</span>
      </label>
      <div className={f.wide}>
        <CollectionNotice form="home" tone="dark" />
        <button type="submit" disabled={sending} className={f.submit}>
          {sending ? 'Sending...' : 'Send my details'}
        </button>
        {error ? <p role="alert" className={f.error}>{error}</p> : null}
      </div>
    </form>
  )
}
