'use client'

import { useCallback, useState } from 'react'
import { isEdited, type ReviewAction } from '@/lib/coaching/review'

/** One proposed extraction as the review screen needs it. */
export interface ReviewItem {
  id: string
  kind: string
  body: string
  original_body: string | null
  owner: string | null
  due_date: string | null
  transcript_quote: string | null
  confidence: number | null
  session_date: string | null
}

export interface ReviewQueueProps {
  items: ReviewItem[]
  /** Applies one decision. Rejects with an Error the component will surface. */
  onDecide: (id: string, action: ReviewAction, body: string) => Promise<void>
}

const KIND_LABEL: Record<string, string> = {
  want: 'Want',
  need: 'Need',
  requirement: 'Requirement',
  commitment: 'Commitment',
  metric: 'Metric',
  blocker: 'Blocker',
  decision: 'Decision',
  open_question: 'Open question',
}

type RowState = { busy: boolean; error: string | null; done: ReviewAction | null }

/**
 * The review queue — where a model's proposal becomes part of a client's record.
 *
 * Deliberately props-driven and free of data fetching: the server page owns the
 * query, this owns the interaction. That split is not decoration — it is what
 * lets the screen be rendered and looked at without a database, which is how
 * the sidebar flyout's positioning defects were found.
 *
 * The body is editable in place. Editing is the point rather than a fallback:
 * the founder's correction is captured against the model's original text and
 * becomes the eval dataset (see lib/coaching/review.ts).
 */
export function ReviewQueue({ items, onDecide }: ReviewQueueProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [state, setState] = useState<Record<string, RowState>>({})

  const bodyOf = useCallback(
    (item: ReviewItem) => drafts[item.id] ?? item.body,
    [drafts],
  )

  const decide = useCallback(
    async (item: ReviewItem, action: ReviewAction) => {
      setState((s) => ({ ...s, [item.id]: { busy: true, error: null, done: null } }))
      try {
        await onDecide(item.id, action, drafts[item.id] ?? item.body)
        setState((s) => ({ ...s, [item.id]: { busy: false, error: null, done: action } }))
      } catch (e) {
        // An honest failure. The row stays in the queue rather than vanishing as
        // though it had been saved.
        setState((s) => ({
          ...s,
          [item.id]: {
            busy: false,
            done: null,
            error: e instanceof Error ? e.message : 'Could not save that decision',
          },
        }))
      }
    },
    [drafts, onDecide],
  )

  if (items.length === 0) {
    return (
      <div
        className="rounded-sm border px-4 py-6 text-[13px]"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Nothing waiting for review. Extractions appear here as sessions are processed.
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const draft = bodyOf(item)
        const edited = isEdited({ id: item.id, status: 'proposed', body: item.body, original_body: item.original_body }, draft)
        const rs = state[item.id] ?? { busy: false, error: null, done: null }

        return (
          <li
            key={item.id}
            className="rounded-sm border px-4 py-3"
            style={{
              borderColor: 'var(--color-border)',
              opacity: rs.done ? 0.55 : 1,
            }}
          >
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest">
              <span style={{ color: 'var(--color-text-disabled)' }}>
                {KIND_LABEL[item.kind] ?? item.kind}
              </span>
              {item.owner && <span style={{ color: 'var(--color-text-disabled)' }}>· {item.owner}</span>}
              {item.due_date && <span style={{ color: 'var(--color-text-disabled)' }}>· due {item.due_date}</span>}
              {typeof item.confidence === 'number' && (
                <span
                  title="Model confidence"
                  style={{ color: item.confidence < 0.6 ? 'var(--color-danger, #dc2626)' : 'var(--color-text-disabled)' }}
                >
                  · {Math.round(item.confidence * 100)}%
                </span>
              )}
              {edited && (
                <span className="ml-auto" style={{ color: 'var(--color-text-primary)' }}>edited</span>
              )}
              {rs.done && (
                <span className="ml-auto" style={{ color: 'var(--color-text-primary)' }}>{rs.done}d</span>
              )}
            </div>

            <textarea
              value={draft}
              onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
              disabled={rs.busy || rs.done !== null}
              rows={2}
              aria-label={`Extraction text for ${KIND_LABEL[item.kind] ?? item.kind}`}
              className="mt-2 w-full resize-y rounded-sm border px-2 py-1 text-[13px]"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--surface-card)',
                color: 'var(--color-text-primary)',
              }}
            />

            {/* The diff. What the model proposed stays visible while the founder
                edits, so an approval is a comparison rather than a guess. */}
            {edited && (
              <div className="mt-1 text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>
                Model proposed: <span className="line-through">{item.body}</span>
              </div>
            )}

            {item.transcript_quote && (
              <blockquote
                className="mt-2 border-l-2 pl-2 text-[12px] italic"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {item.transcript_quote}
                {item.session_date && (
                  <span className="not-italic" style={{ color: 'var(--color-text-disabled)' }}> — {item.session_date}</span>
                )}
              </blockquote>
            )}

            {!item.transcript_quote && (
              // An extraction without a quote is an assertion, not evidence
              // (migration comment on transcript_quote). Say so rather than
              // letting it approve as quietly as a grounded one.
              <div className="mt-2 text-[11px]" style={{ color: 'var(--color-danger, #dc2626)' }}>
                No transcript quote — ungrounded, check the session before approving.
              </div>
            )}

            {rs.error && (
              <div className="mt-2 text-[12px]" style={{ color: 'var(--color-danger, #dc2626)' }}>
                {rs.error}
              </div>
            )}

            {rs.done === null && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => void decide(item, 'approve')}
                  disabled={rs.busy}
                  className="rounded-sm border px-3 h-7 text-[12px] font-medium transition-colors duration-100 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  {rs.busy ? 'Saving…' : edited ? 'Approve edit' : 'Approve'}
                </button>
                <button
                  onClick={() => void decide(item, 'reject')}
                  disabled={rs.busy}
                  className="rounded-sm border px-3 h-7 text-[12px] transition-colors duration-100 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
