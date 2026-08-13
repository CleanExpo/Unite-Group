import Link from 'next/link'
import styles from './six-monitor-canvas.module.css'

type QueueData = { total_rows: number; shown_rows: number; read_error: string | null }
type BlockedData = { total_lanes: number; blocked_count: number; read_error: string | null }

interface SixMonitorCanvasProps {
  actionQueue: QueueData
  blockedLanes: BlockedData
  projectCount: number
  activeProjectCount: number
  toolCount: number
  sourceCount: number
}

export function SixMonitorCanvas({
  actionQueue,
  blockedLanes,
  projectCount,
  activeProjectCount,
  toolCount,
  sourceCount,
}: SixMonitorCanvasProps) {
  const queueUnavailable = Boolean(actionQueue.read_error)
  const blockersUnavailable = Boolean(blockedLanes.read_error)
  const queueSummary = queueUnavailable
    ? 'Queue source unavailable'
    : `${actionQueue.total_rows} proposed action${actionQueue.total_rows === 1 ? '' : 's'}`
  const blockerSummary = blockersUnavailable
    ? 'Lane source unavailable'
    : `${blockedLanes.blocked_count} blocked of ${blockedLanes.total_lanes} lanes`
  const nextAction = queueUnavailable
    ? 'Restore the queue source before making a delivery decision.'
    : actionQueue.total_rows > 0
      ? 'Review the next proposed action and its evidence before approval.'
      : 'No action is waiting. Inspect live operations only when a source changes.'

  return (
    <main className={styles.canvas} aria-label="Mission Control workspace" data-testid="six-monitor-canvas">
      <section className={styles.inspector} aria-labelledby="mission-inspector-title">
        <span className={styles.eyebrow}>Inspector</span>
        <h1 id="mission-inspector-title">Work from verified truth first.</h1>
        <p className={styles.lede}>
          Use this surface to choose the next safe action. Detail stays behind the domain links until it is needed.
        </p>
        <dl className={styles.decisionGrid}>
          <div>
            <dt>Next safe action</dt>
            <dd>{nextAction}</dd>
          </div>
          <div>
            <dt>Approval gate</dt>
            <dd>Proposals do not execute until their named approval and evidence gates pass.</dd>
          </div>
          <div>
            <dt>Current signal</dt>
            <dd>{queueSummary}. {blockerSummary}.</dd>
          </div>
        </dl>
      </section>

      <section className={styles.domains} aria-labelledby="mission-domains-title">
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Domains</span>
          <h2 id="mission-domains-title">Operational surfaces</h2>
        </div>
        <div className={styles.domainGrid}>
          <Domain
            title="Operations"
            state={queueUnavailable || blockersUnavailable ? 'unavailable' : 'source read'}
            summary={`${queueSummary} · ${blockerSummary}`}
            detail="Agents, approvals, delivery and proof"
            href="/founder/command-centre/operations"
          />
          <Domain
            title="Portfolio"
            state="registry"
            summary={`${projectCount} projects · ${activeProjectCount} active`}
            detail="Businesses, opportunities and integration state"
            href="/founder/command-centre/portfolio"
            id="portfolio"
          />
          <Domain
            title="Providers"
            state="catalogue"
            summary={`${sourceCount} sources · ${toolCount} tool entries`}
            detail="Account and provider availability"
            href="/founder/command-centre/providers"
          />
          <Domain
            title="Knowledge"
            state="catalogue"
            summary={`${toolCount} capability entries`}
            detail="Wiki, memory and source provenance"
            href="/founder/command-centre/knowledge"
            id="capability-bus"
          />
          <Domain
            title="Evidence"
            state="gated"
            summary="Receipts and delivery proof"
            detail="Technical and visual evidence stay separate"
            href="/founder/command-centre/operations#evidence-stream"
          />
          <Domain
            title="Machines"
            state="verified adapter only"
            summary="Local and mesh status"
            detail="No host mapping is inferred from catalogue data"
            href="/founder/command-centre/six-zone"
          />
        </div>
      </section>
    </main>
  )
}

function Domain({
  title,
  state,
  summary,
  detail,
  href,
  id,
}: {
  title: string
  state: string
  summary: string
  detail: string
  href: string
  id?: string
}) {
  return (
    <Link href={href} className={styles.domain} id={id}>
      <span className={styles.domainTopline}>
        <span className={styles.signal} aria-hidden />
        <strong>{title}</strong>
        <span className={styles.state}>{state}</span>
      </span>
      <span className={styles.summary}>{summary}</span>
      <span className={styles.detail}>{detail}</span>
    </Link>
  )
}
