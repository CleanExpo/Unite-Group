'use client'

import Link from 'next/link'
import { MissionStatusBand } from './MissionStatusBand'
import styles from './six-monitor-canvas.module.css'

type QueueData = { total_rows: number; shown_rows: number; read_error: string | null }
type BlockedData = { total_lanes: number; blocked_count: number; read_error: string | null }

export function SixMonitorCanvas({
  actionQueue,
  blockedLanes,
  toolCount,
}: {
  actionQueue: QueueData
  blockedLanes: BlockedData
  toolCount: number
}) {
  const queueLabel = actionQueue.read_error
    ? 'Queue source unavailable'
    : `${actionQueue.total_rows} queued action${actionQueue.total_rows === 1 ? '' : 's'}`
  const blockedLabel = blockedLanes.read_error
    ? 'Blocker source unavailable'
    : `${blockedLanes.blocked_count} blocked of ${blockedLanes.total_lanes} lanes`

  return (
    <section className={styles.canvas} aria-label="Mission Control canvas" data-testid="six-monitor-canvas">
      <aside className={styles.sidebar} aria-label="Command Centre tools">
        <span className={styles.sideTitle}>Command</span>
        <button type="button" className={styles.sidebarButton} onClick={openCommandPalette}>Search</button>
        <Link href="/founder/command-centre/operations">Agents & approvals</Link>
        <Link href="/founder/command-centre/operations">Delivery & proof</Link>
        <Link href="/founder/command-centre/providers">Provider accounts</Link>
        <Link href="/founder/command-centre/knowledge">Knowledge</Link>
        <a href="#command-brief">Command brief</a>
      </aside>

      <div className={styles.matrix}>
        <Monitor colour="ruby" eyebrow="PC pair · unassigned" title="Build & proof" href="/founder/command-centre/operations">
          <p>{queueLabel}</p><small>The queue source has no machine assignment. Open Operations for task receipts and validation.</small>
        </Monitor>
        <Monitor colour="gold" eyebrow="Mac Mini pair · mapping unavailable" title="Fleet heartbeat" href="/founder/command-centre/operations">
          <p>Verified state below</p><small>Only reported heartbeat and session data are treated as live.</small>
        </Monitor>
        <section className={styles.commandMatrix}>
          <span>Command Matrix</span>
          <strong>One authenticated control surface</strong>
          <p>Work, evidence and machine status stay separate until their source confirms them.</p>
          <a href="#command-brief">Open command brief</a>
        </section>
        <Monitor colour="gold" eyebrow="Mac Mini pair · local AI" title="Ollama / Gemma" href="/founder/command-centre/operations">
          <p>Connection state is not yet supplied.</p><small>This visual pairing is not a host mapping. Shown as unavailable until a verified adapter reports it.</small>
        </Monitor>
        <Monitor colour="emerald" eyebrow="MacBook pair · unassigned" title="Knowledge & tools" href="/founder/command-centre/knowledge">
          <p>{toolCount} catalogue entries</p><small>Catalogue data has no machine assignment or freshness check. Open Knowledge for source state.</small>
        </Monitor>
        <Monitor colour="emerald" eyebrow="MacBook pair · unassigned" title="Queue & blockers" href="/founder/command-centre/operations">
          <p>{blockedLabel}</p><small>Blocker data has no machine assignment. Dispatch is not connected unless Operations proves it.</small>
        </Monitor>
      </div>
      <div className={styles.fleetBand}><MissionStatusBand /></div>
    </section>
  )
}

function openCommandPalette() {
  window.dispatchEvent(new Event('command-centre:open-palette'))
}

function Monitor({ colour, eyebrow, title, href, children }: {
  colour: 'ruby' | 'gold' | 'emerald'
  eyebrow: string
  title: string
  href: string
  children: React.ReactNode
}) {
  return (
    <article className={`${styles.monitor} ${styles[colour]}`}>
      <span className={styles.monitorEyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      <div className={styles.monitorBody}>{children}</div>
      <Link href={href}>Open detail →</Link>
    </article>
  )
}
