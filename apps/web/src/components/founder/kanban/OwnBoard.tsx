'use client'

// Own editable Kanban board (WS2 P3 UI). Reads/writes the founder's OWN
// kanban_task table via /api/kanban/cards — distinct from the read-only Linear
// projection in KanbanBoard.tsx. Cards move one column at a time (◀ ▶); a new
// card is created per column. Honest loading/error/empty states (No-Invaders #1).

import { useCallback, useEffect, useState } from 'react'

import { adjacentStatus } from '@/lib/kanban/order'
import { COLUMNS, PRIORITY_COLOURS, type Task, type TaskStatus } from '@/types/kanban'

interface ColumnData {
  id: TaskStatus
  label: string
  tasks: Task[]
}

export function OwnBoard() {
  const [columns, setColumns] = useState<ColumnData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/kanban/cards', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? 'Sign in to view your board.'
            : `Board unavailable (HTTP ${res.status}). Apply the kanban_task migration.`
        )
      }
      const data = (await res.json()) as { columns: ColumnData[] }
      setColumns(data.columns)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load board.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const createCard = async (status: TaskStatus) => {
    const title = (drafts[status] ?? '').trim()
    if (!title || busy) return
    setBusy(true)
    try {
      await fetch('/api/kanban/cards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, status }),
      })
      setDrafts((d) => ({ ...d, [status]: '' }))
      await load()
    } finally {
      setBusy(false)
    }
  }

  const moveCard = async (id: string, from: TaskStatus, dir: 'prev' | 'next') => {
    const to = adjacentStatus(from, dir)
    if (!to || busy) return
    setBusy(true)
    try {
      await fetch(`/api/kanban/cards/${id}/move`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: to, index: 9999 }),
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-sm opacity-60">Loading board…</div>
  }
  if (error) {
    return (
      <div className="rounded-sm border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    )
  }

  return (
    <div className="flex gap-4 min-w-max">
      {columns.map((col) => (
        <section
          key={col.id}
          className="w-72 shrink-0 rounded-sm p-3"
          style={{ background: 'var(--surface-raised, #0b0b0b)' }}
        >
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide opacity-80">
              {col.label}
            </h3>
            <span className="text-xs opacity-50">{col.tasks.length}</span>
          </header>

          <ul className="flex flex-col gap-2">
            {col.tasks.length === 0 && (
              <li className="text-xs opacity-40">No cards</li>
            )}
            {col.tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-sm p-2 text-sm"
                style={{
                  background: 'var(--surface-canvas, #050505)',
                  borderLeft: `3px solid ${PRIORITY_COLOURS[t.priority] ?? '#666'}`,
                }}
              >
                <div className="mb-1">{t.title}</div>
                <div className="flex justify-between text-xs opacity-60">
                  <button
                    type="button"
                    disabled={busy || !adjacentStatus(col.id, 'prev')}
                    onClick={() => moveCard(t.id, col.id, 'prev')}
                    className="disabled:opacity-20"
                    aria-label="Move left"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    disabled={busy || !adjacentStatus(col.id, 'next')}
                    onClick={() => moveCard(t.id, col.id, 'next')}
                    className="disabled:opacity-20"
                    aria-label="Move right"
                  >
                    ▶
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <form
            className="mt-3 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              createCard(col.id)
            }}
          >
            <input
              value={drafts[col.id] ?? ''}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [col.id]: e.target.value }))
              }
              placeholder="New card…"
              className="min-w-0 flex-1 rounded-sm bg-black/40 px-2 py-1 text-xs outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-sm px-2 py-1 text-xs disabled:opacity-40"
              style={{ background: 'var(--accent-cyan, #00F5FF)', color: '#050505' }}
            >
              +
            </button>
          </form>
        </section>
      ))}
      {columns.length === 0 &&
        COLUMNS.map((c) => (
          <div key={c.id} className="w-72 text-xs opacity-40">
            {c.label}
          </div>
        ))}
    </div>
  )
}
