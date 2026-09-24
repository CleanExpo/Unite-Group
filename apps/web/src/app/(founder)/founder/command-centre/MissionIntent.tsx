'use client'

// MissionIntent — Capture Intent panel inside the live mission detail
// (AI-Native SDLC Stage 1). Draft intent.md from the mission's own words and
// answers, let the founder edit it, then accept it with author + timestamp.
// Success is only shown on a 2xx response; every failure is shown as an error.

import { useState } from 'react'
import type { DeliveryMissionView } from '@/lib/command-centre/delivery-types'
import styles from './founder-desk.module.css'

type StoredIntent = NonNullable<DeliveryMissionView['intent']>

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string }
    if (data && typeof data.error === 'string' && data.error) return data.error
  } catch {
    // fall through to the status-based message
  }
  return `${fallback} (HTTP ${response.status})`
}

export function MissionIntent({ mission, disabled }: { mission: DeliveryMissionView; disabled: boolean }) {
  const stored = mission.intent ?? null
  const [draft, setDraft] = useState<string | null>(stored?.status === 'draft' ? stored.markdown : null)
  const [accepted, setAccepted] = useState<StoredIntent | null>(stored?.status === 'accepted' ? stored : null)
  const [working, setWorking] = useState<'drafting' | 'accepting' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!stored && !mission.intentReady && draft === null && accepted === null) return null

  async function draftIntent() {
    setWorking('drafting'); setError(null)
    try {
      const response = await fetch('/api/command-centre/intent', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: mission.taskId }),
      })
      if (!response.ok) { setError(await readError(response, 'Could not draft intent.md')); return }
      const data = (await response.json()) as { markdown?: string }
      if (typeof data.markdown === 'string' && data.markdown.trim()) setDraft(data.markdown)
      else setError('The server responded but returned no intent.md.')
    } catch {
      setError('Network error — could not reach the intent service.')
    } finally { setWorking(null) }
  }

  async function acceptIntent() {
    if (draft === null) return
    setWorking('accepting'); setError(null)
    try {
      const response = await fetch('/api/command-centre/intent', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: mission.taskId, markdown: draft }),
      })
      if (!response.ok) { setError(await readError(response, 'Could not accept intent.md')); return }
      const data = (await response.json()) as { markdown?: string; acceptedAt?: string }
      if (typeof data.markdown === 'string' && typeof data.acceptedAt === 'string') {
        setAccepted({ status: 'accepted', markdown: data.markdown, acceptedAt: data.acceptedAt })
        setDraft(null); setCopied(false)
      } else setError('The server responded but did not confirm the acceptance.')
    } catch {
      setError('Network error — could not reach the intent service.')
    } finally { setWorking(null) }
  }

  async function copyIntent() {
    if (!accepted) return
    setError(null)
    try {
      await navigator.clipboard.writeText(accepted.markdown)
      setCopied(true)
    } catch {
      setCopied(false)
      setError('Could not copy to the clipboard — select the text and copy it manually.')
    }
  }

  function revise() {
    if (!accepted) return
    setDraft(accepted.markdown); setAccepted(null); setCopied(false); setError(null)
  }

  const locked = disabled || working !== null
  return <section className={styles.questions} aria-label="Capture Intent">
    <h3>Capture Intent</h3>
    <p className={styles.helper}>Describe it in your own words → answer the questions → check the intent → accept.</p>
    {draft === null && accepted === null && <button className={styles.secondaryButton} disabled={locked} onClick={() => void draftIntent()}>
      {working === 'drafting' ? 'Drafting…' : 'Draft intent.md'}
    </button>}
    {draft !== null && <div className={styles.answerField}>
      <textarea aria-label="intent.md" value={draft} onChange={e => setDraft(e.target.value)} disabled={locked} rows={18} />
      <button className={styles.primaryButton} disabled={locked || !draft.trim()} onClick={() => void acceptIntent()}>
        {working === 'accepting' ? 'Accepting…' : 'Accept intent'}
      </button>
    </div>}
    {accepted && <div className={styles.answerField}>
      <textarea aria-label="intent.md" value={accepted.markdown} readOnly rows={18} />
      <p className={styles.helper}>Accepted {accepted.acceptedAt ? new Date(accepted.acceptedAt).toLocaleString('en-AU') : '(time not recorded)'}</p>
      <div className={styles.presetButtons}>
        <button className={styles.primaryButton} onClick={() => void copyIntent()}>{copied ? 'Copied' : 'Copy intent.md'}</button>
        <button className={styles.secondaryButton} disabled={locked} onClick={revise}>Revise</button>
      </div>
    </div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </section>
}
