'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { StaleReadNotice } from '@/components/ui/StaleReadNotice'

interface Comment {
  id: string
  insight_id: string
  author: 'founder' | 'ai'
  content: string
  created_at: string
}

interface InsightDiscussionProps {
  insightId: string
}

export function InsightDiscussion({ insightId }: InsightDiscussionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Write-path slot: the POST that adds a note. Cleared at submit ENTRY on
  // purpose — it describes the write in flight, so the previous attempt's
  // message must not survive into a new one. The read-side rule (clear on
  // success only) applies to `loadError` below, NOT to this.
  const [error, setError] = useState<string | null>(null)
  // Read-path slot. The read was `.catch(() => {})`, so a failed comments read
  // left `comments` at [] and the surface rendered "No notes yet. Add your
  // thoughts below." — a fabricated fact, and precisely the shape the census
  // `FABRICATED_FACT` pattern exists to catch. [UNI-2486]
  const [loadError, setLoadError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    let active = true
    fetch(`/api/strategy/insights/${insightId}/comments`)
      .then((r) => {
        if (!r.ok) throw new Error('read failed')
        return r.json()
      })
      .then((d: { comments: Comment[] }) => {
        if (!active) return
        setComments(d.comments ?? [])
        // Cleared on SUCCESS only, never at loader entry — entry-clearing would
        // un-mark the retained thread the moment Retry is pressed, which is the
        // inversion this audit had to undo elsewhere.
        setLoadError(null)
      })
      .catch(() => {
        if (active) setLoadError('Could not load the discussion — this is a failed read, not an empty thread.')
      })
    return () => {
      active = false
    }
  }, [insightId])

  useEffect(() => load(), [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const staleRead = Boolean(loadError) && comments.length > 0

  async function submit() {
    if (!text.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/strategy/insights/${insightId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim(), author: 'founder' }),
      })
      if (!res.ok) {
        setError('Could not post your note — please try again.')
        return
      }
      const d = await res.json() as { comment: Comment }
      if (d.comment) {
        setComments((prev) => [...prev, d.comment])
        setText('')
      } else {
        setError('Note was not saved — please try again.')
      }
    } catch {
      setError('Network error — could not post your note.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-disabled)' }}>
        Discussion
      </p>

      {/* Read failure is announced whenever it is set — NOT gated on the thread
          being empty. Gating it on emptiness is what let a fabricated fact sit
          beside its own warning on the surfaces fixed on 11/08/2026. */}
      {loadError && (
        <div className="mb-3 flex items-center gap-2">
          <p role="alert" className="text-[11px]" style={{ color: '#ef4444' }}>
            {loadError}
          </p>
          {/* Recovery control — never disabled; it is the way back to a live read. */}
          <button
            type="button"
            onClick={() => load()}
            className="text-[11px] px-2 py-1 rounded-sm border shrink-0"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-disabled)' }}
          >
            ↻ retry
          </button>
        </div>
      )}

      {/* VISIBLE half only, and `actionsDisabled` deliberately stays OFF: the
          thread carries no control that acts on a retained comment. Send
          APPENDS a new note rather than mutating one of these, so disabling it
          would strand the founder mid-outage for no safety gain — the trap
          StaleReadNotice's own header warns about. */}
      {staleRead && <StaleReadNotice source="Insight discussion" />}

      {comments.length > 0 && (
        <div
          className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin' }}
          data-stale-read={staleRead ? 'true' : undefined}
        >
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-sm px-3 py-2 text-[12px] leading-relaxed"
              style={{
                borderLeft: c.author === 'ai' ? '2px solid #16a34a' : '2px solid var(--color-border)',
                background: 'var(--surface-canvas)',
                color: 'var(--color-text-primary)',
              }}
            >
              <span className="text-[10px] mr-2" style={{ color: 'var(--color-text-disabled)' }}>
                {c.author === 'ai' ? 'AI' : 'You'} ·{' '}
                {new Date(c.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {c.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* "No notes yet" is a claim about the thread, so it may only be made
          from a read that succeeded. Re-gated on `loadError`. */}
      {!loadError && comments.length === 0 && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--color-text-disabled)' }}>
          No notes yet. Add your thoughts below.
        </p>
      )}

      {error && (
        <div role="alert" className="mb-2 text-[11px]" style={{ color: '#ef4444' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          placeholder="Add a note… (⌘↵ to send)"
          rows={2}
          className="flex-1 resize-none rounded-sm border px-3 py-2 text-[12px] outline-hidden"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--surface-canvas)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          onClick={submit}
          disabled={!text.trim() || submitting}
          className="px-3 rounded-sm flex items-center transition-colors disabled:opacity-40"
          style={{ background: '#16a34a', color: '#fffdf7' }}
          aria-label="Send note"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}
