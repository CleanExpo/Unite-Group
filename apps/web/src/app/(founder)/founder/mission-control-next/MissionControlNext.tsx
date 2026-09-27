'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  classifyFleet,
  classifyMissions,
  classifyQueue,
  classifyRevenue,
  toneFor,
  type CardStatus,
  type ReadResult,
} from '@/lib/mission-control-next/card-state'
import {
  performGovernedToggle,
  toggleTargetFor,
  type WriteOutcome,
} from '@/lib/mission-control-next/governed-write'
import { MISSION_CONTROL_NEXT_TABS, type MissionControlNextTab } from '@/lib/mission-control-next/tabs'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import type { DeliveryMissionView } from '@/lib/command-centre/delivery-types'
import styles from './mission-control-next.module.css'

const POLL_MS = 30_000
const TAB_LABELS: Record<MissionControlNextTab, string> = {
  home: 'Home',
  missions: 'Missions',
  world: 'World',
  portfolio: 'Portfolio',
  evidence: 'Evidence',
}
const PRIORITY_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }
const OPEN_ATTENTION = new Set(['blocked', 'awaiting_approval', 'running'])
const CLOSED = new Set(['done', 'failed'])

interface Reads {
  missions: ReadResult
  queue: ReadResult
  fleet: ReadResult
  revenue: ReadResult
}

async function read(url: string): Promise<ReadResult> {
  const fetchedAt = new Date().toISOString()
  try {
    const res = await fetch(url, { cache: 'no-store' })
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = null
    }
    return { ok: res.ok, status: res.status, body, fetchedAt }
  } catch {
    return { ok: false, status: 0, body: null, fetchedAt }
  }
}

function when(iso: string | null): string {
  if (!iso) return 'time unknown'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'time unknown'
  return d.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', dateStyle: 'short', timeStyle: 'short' })
}

function aud(cents: number): string {
  return (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function list<T>(body: unknown, key: string): T[] {
  const value = body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : null
  return Array.isArray(value) ? (value as T[]) : []
}

/** A card only shows values when its source read is usable; failed, unknown and test reads show none. */
function Card({ title, status, children }: { title: string; status: CardStatus; children?: ReactNode }) {
  const showValues = status.state === 'live' || status.state === 'partial' || status.state === 'stale'
  return (
    <section className={styles.card} data-state={status.state} data-tone={toneFor(status.state)} aria-label={title}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <span className={styles.badge}>{status.state.toUpperCase()}</span>
      </header>
      <p className={styles.detail}>{status.detail}</p>
      {showValues ? children : null}
      <p className={styles.provenance}>
        {status.source} · {when(status.observedAt)}
      </p>
    </section>
  )
}

export function MissionControlNext({ tab }: { tab: MissionControlNextTab }) {
  const [reads, setReads] = useState<Reads | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<{ taskId: string; result: WriteOutcome } | null>(null)

  const refresh = useCallback(async () => {
    const [missions, queue, fleet, revenue] = await Promise.all([
      read('/api/command-centre/missions'),
      read('/api/command-centre/queue'),
      read('/api/command-centre/mesh-fleet'),
      read('/api/command-centre/revenue'),
    ])
    setReads({ missions, queue, fleet, revenue })
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const nav = (
    <nav className={styles.tabs} aria-label="Mission Control sections">
      {MISSION_CONTROL_NEXT_TABS.map((t) => (
        <Link key={t} href={`?tab=${t}`} className={styles.tab} aria-current={t === tab ? 'page' : undefined}>
          {TAB_LABELS[t]}
        </Link>
      ))}
    </nav>
  )

  if (!reads) {
    return (
      <main className={styles.page}>
        {nav}
        <p className={styles.muted}>Reading live sources…</p>
      </main>
    )
  }

  const now = Date.now()
  const missionsStatus = classifyMissions(reads.missions, now)
  const queueStatus = classifyQueue(reads.queue, now)
  const fleetStatus = classifyFleet(reads.fleet, now)
  const revenueStatus = classifyRevenue(reads.revenue, now)

  const missions = list<DeliveryMissionView>(reads.missions.body, 'missions')
  const tasks = list<CommandCentreTask>(reads.queue.body, 'tasks')
  // No "active mission" field exists yet; the most recently updated open mission stands in, and says so.
  const activeMission =
    [...missions].filter((m) => !CLOSED.has(m.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  const priorities = tasks
    .filter((t) => OPEN_ATTENTION.has(t.status))
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)
  const toggleable = tasks.filter((t) => toggleTargetFor(t) !== null).slice(0, 10)
  const accounts = list<Record<string, unknown>>(reads.revenue.body, 'accounts')

  async function toggle(task: CommandCentreTask) {
    setPendingId(task.id)
    setOutcome(null)
    const result = await performGovernedToggle(task)
    setOutcome({ taskId: task.id, result })
    setPendingId(null)
    await refresh()
  }

  const activeMissionCard = (
    <Card title="Active mission" status={missionsStatus}>
      {activeMission ? (
        <div>
          <p className={styles.value}>{activeMission.title}</p>
          <p className={styles.muted}>
            Most recently updated open mission · stage {activeMission.stage} · next: {activeMission.nextAction.label}
          </p>
          {activeMission.blockers.length > 0 ? (
            <ul className={styles.list}>
              {activeMission.blockers.map((b) => (
                <li key={b.code}>{b.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className={styles.muted}>No open delivery mission.</p>
      )}
    </Card>
  )

  const fleetCard = (
    <Card title="Fleet" status={fleetStatus}>
      <ul className={styles.list}>
        {list<Record<string, unknown>>(reads.fleet.body, 'machines').map((m) => (
          <li key={String(m.host)}>
            {String(m.host)} · {m.is_stale === true ? 'stale' : 'reporting'} · last seen {when(typeof m.last_seen === 'string' ? m.last_seen : null)}
          </li>
        ))}
      </ul>
    </Card>
  )

  const revenueCard = (
    <Card title="Paying customers and MRR (Stripe)" status={revenueStatus}>
      <ul className={styles.list}>
        {accounts.map((a) => {
          const mrr = a.mrr as { rows?: Array<{ business: string; label: string; mrrCents: number; subscriptions: number }> } | undefined
          if (a.status !== 'ok') return <li key={String(a.account)}>{String(a.label)}: not connected ({String(a.reason)})</li>
          return (mrr?.rows ?? []).map((row) => (
            <li key={`${String(a.account)}-${row.business}`}>
              {row.label}: {aud(row.mrrCents)} MRR · {row.subscriptions} active subscriptions
            </li>
          ))
        })}
      </ul>
    </Card>
  )

  let body: ReactNode
  if (tab === 'home') {
    body = (
      <>
        <Card title="Top priorities" status={queueStatus}>
          {priorities.length === 0 ? (
            <p className={styles.muted}>Nothing blocked, running or awaiting approval.</p>
          ) : (
            <ol className={styles.list}>
              {priorities.map((t) => (
                <li key={t.id}>
                  <strong>{t.priority}</strong> {t.title} · {t.status.replace('_', ' ')}
                </li>
              ))}
            </ol>
          )}
        </Card>
        {activeMissionCard}
        {fleetCard}
        {revenueCard}
      </>
    )
  } else if (tab === 'missions') {
    body = (
      <>
        {activeMissionCard}
        <Card title="Approval requests (governed write)" status={queueStatus}>
          {toggleable.length === 0 ? (
            <p className={styles.muted}>No task is in proposed or awaiting approval.</p>
          ) : (
            <ul className={styles.list}>
              {toggleable.map((t) => {
                const target = toggleTargetFor(t)
                return (
                  <li key={t.id} className={styles.row}>
                    <span>
                      {t.title} · {t.status.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      className={styles.button}
                      disabled={pendingId !== null}
                      onClick={() => void toggle(t)}
                    >
                      {pendingId === t.id ? 'Saving…' : target === 'awaiting_approval' ? 'Ask for approval' : 'Move back to proposed'}
                    </button>
                    {outcome?.taskId === t.id ? (
                      <span className={styles.outcome} data-kind={outcome.result.kind} role="status">
                        {outcome.result.kind === 'confirmed'
                          ? `Saved and read back: ${outcome.result.status.replace('_', ' ')} at ${when(outcome.result.updatedAt)}`
                          : outcome.result.kind === 'rejected'
                            ? `Not saved: ${outcome.result.message}`
                            : `Not confirmed: ${outcome.result.reason}`}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </>
    )
  } else if (tab === 'world') {
    body = (
      <Card
        title="Restoration World"
        status={{
          state: 'unavailable',
          source: 'none',
          observedAt: null,
          detail: 'No world-state source exists yet. The canonical world model is UNI-2774.',
        }}
      />
    )
  } else if (tab === 'portfolio') {
    body = (
      <>
        {revenueCard}
        {fleetCard}
      </>
    )
  } else {
    body = (
      <Card title="Evidence for the active mission" status={missionsStatus}>
        {!activeMission || activeMission.receipts.length === 0 ? (
          <p className={styles.muted}>No receipts recorded for this mission.</p>
        ) : (
          <ul className={styles.list}>
            {activeMission.receipts.map((r) => (
              <li key={`${r.kind}-${r.reference}`}>
                {r.label} · <code>{r.reference}</code>
              </li>
            ))}
          </ul>
        )}
        {activeMission?.previewUrl ? (
          <p className={styles.muted}>
            Preview: <a href={activeMission.previewUrl}>{activeMission.previewUrl}</a>
          </p>
        ) : null}
      </Card>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <h1 className={styles.title}>Mission Control · preview</h1>
        <button type="button" className={styles.button} onClick={() => void refresh()}>
          Refresh
        </button>
      </header>
      {nav}
      <div className={styles.grid}>{body}</div>
    </main>
  )
}
