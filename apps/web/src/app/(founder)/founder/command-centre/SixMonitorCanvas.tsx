import Link from 'next/link'
import { MissionStatusBand } from './MissionStatusBand'
import styles from './six-monitor-canvas.module.css'

type QueueData = { total_rows: number; shown_rows: number; read_error: string | null }
type BlockedData = { total_lanes: number; blocked_count: number; read_error: string | null }

export function SixMonitorCanvas({
  actionQueue,
  blockedLanes,
  toolCount,
  knowledgeReady,
}: {
  actionQueue: QueueData
  blockedLanes: BlockedData
  toolCount: number
  knowledgeReady: boolean
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
        <a href="#command-brief">Search</a>
        <Link href="/founder/command-centre/operations">Agents</Link>
        <a href="#command-brief">Command Chat</a>
        <Link href="/founder/command-centre/operations">Approvals</Link>
        <Link href="/founder/command-centre/operations">PRs</Link>
        <Link href="/founder/command-centre/providers">Finance</Link>
        <Link href="/founder/command-centre/knowledge">Media</Link>
        <Link href="/founder/command-centre/knowledge">Knowledge</Link>
      </aside>

      <div className={styles.matrix}>
        <Monitor colour="ruby" eyebrow="PC · Delivery" title="Build & proof" href="/founder/command-centre/operations">
          <p>{queueLabel}</p><small>Open the Operations deck for task receipts and validation.</small>
        </Monitor>
        <Monitor colour="gold" eyebrow="Mac Mini · Host" title="Fleet heartbeat" href="/founder/command-centre/operations">
          <p>Live state below</p><small>Only heartbeat and session data are treated as live.</small>
        </Monitor>
        <section className={styles.commandMatrix}>
          <span>Command Matrix</span>
          <strong>One authenticated control surface</strong>
          <p>Work, evidence and machine status stay separate until their source confirms them.</p>
          <a href="#command-brief">Open command brief</a>
        </section>
        <Monitor colour="gold" eyebrow="Mac Mini · Local AI" title="Ollama / Gemma" href="/founder/command-centre/operations">
          <p>Connection state is not yet supplied.</p><small>Shown as unavailable until a verified local adapter reports it.</small>
        </Monitor>
        <Monitor colour="emerald" eyebrow="MacBook · Knowledge" title="Second Brain" href="/founder/command-centre/knowledge">
          <p>{knowledgeReady ? `${toolCount} catalogued tools` : 'Knowledge source unavailable'}</p><small>Open the Knowledge deck for graph and source freshness.</small>
        </Monitor>
        <Monitor colour="emerald" eyebrow="MacBook · Work" title="Queue & blockers" href="/founder/command-centre/operations">
          <p>{blockedLabel}</p><small>Dispatch is not connected unless the Operations deck proves it.</small>
        </Monitor>
      </div>
      <div className={styles.fleetBand}><MissionStatusBand /></div>
    </section>
  )
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
