'use client'

// ApprovalQueue — the /founder/approvals decision surface. The page promises
// "actions waiting for your decision", so every row carries live Approve /
// Reject controls wired to POST /api/approvals/[id]/decision (UNI-2373
// register P2 — the component previously rendered read-only rows with no
// wiring). Success is only ever claimed on a 2xx response; a failed decision
// surfaces an honest error and the row stays put.

import { useState } from 'react'
import type { ApprovalItem } from '@/app/(founder)/founder/approvals/page'

type Decision = 'approve' | 'reject'

function formatType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(iso: string): string {
  // timeZone pinned so the server render and client hydration produce the
  // same string (this is a client component fed server props).
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Brisbane',
  })
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data && typeof data.error === 'string' && data.error) return data.error
  } catch {
    // fall through
  }
  return `${fallback} (HTTP ${res.status})`
}

export function ApprovalQueue({ items: initialItems }: { items: ApprovalItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(id: string, decision: Decision) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/approvals/${id}/decision`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) {
        setError(await readError(res, `Could not ${decision} this action`))
        return
      }
      // The row is confirmed decided server-side; drop it from the pending list.
      setItems((rows) => rows.filter((r) => r.id !== id))
    } catch {
      setError(`Network error — could not ${decision} this action.`)
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <span className="text-[24px]" style={{ color: 'var(--color-text-muted)' }}>&#x2713;</span>
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>No pending approvals</p>
        <p className="text-[11px] max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          AI-requested actions awaiting your sign-off will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div
          role="alert"
          className="rounded-sm px-4 py-2 text-[12px]"
          style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.35)' }}
        >
          {error}
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-[#fff7ec] border border-white/6 rounded-sm px-4 py-3 flex items-start gap-4"
        >
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-[#0A0A0A] truncate">{item.title}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-sm shrink-0"
                style={{
                  background: 'rgba(22, 163, 74, 0.08)',
                  color: 'var(--color-accent, #16a34a)',
                  border: '1px solid rgba(22, 163, 74, 0.15)',
                }}
              >
                {formatType(item.type)}
              </span>
            </div>
            {item.description && (
              <p className="text-[11px] text-[#5f5f66] line-clamp-2">{item.description}</p>
            )}
          </div>
          <time
            className="text-[11px] text-[#5f5f66] shrink-0 pt-0.5"
            dateTime={item.created_at}
          >
            {formatDate(item.created_at)}
          </time>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void decide(item.id, 'reject')}
              disabled={busyId !== null}
              className="h-7 px-3 rounded-sm text-[12px] font-medium border transition-colors hover:bg-[rgba(239,68,68,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            >
              {busyId === item.id ? '…' : 'Reject'}
            </button>
            <button
              type="button"
              onClick={() => void decide(item.id, 'approve')}
              disabled={busyId !== null}
              className="h-7 px-3 rounded-sm text-[12px] font-medium border transition-colors hover:bg-[rgba(22,163,74,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.4)' }}
            >
              {busyId === item.id ? '…' : 'Approve'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
