import type { DashboardSummaryResult } from '@/lib/command-centre/dashboard-summary'
import type { EvidenceStreamResult } from '@/lib/command-centre/evidence-stream'
import type { ActionQueueTileData } from '../ActionQueueTile'
import type { BlockedLanesData } from '../BlockedLanesTile'
import type { AgentEventsWallResult } from '@/lib/command-centre/agent-events-wall'
import { MissionControlShell } from '../MissionControlShell'
import { QueueBoard } from '../QueueBoard'
import { OperatingHealthTile } from '../OperatingHealthTile'
import { EvidenceStreamTile } from '../EvidenceStreamTile'
import { ActionQueueTile } from '../ActionQueueTileView'
import { BlockedLanesTile } from '../BlockedLanesTileView'
import { InProgressPRsTile } from '../InProgressPRsTile'
import { AgentEventsWallTile } from '../AgentEventsWallTile'
import { MargotHealthTile } from '@/components/command-centre/margot-health/MargotHealthTile'
import { TeamActivityTile } from '@/components/command-centre/team-activity/TeamActivityTile'
import { EmailAccountsTile } from '@/components/command-centre/email-accounts/EmailAccountsTile'
import { HermesControlPanel } from '@/components/command-centre/control-panel/HermesControlPanel'
import { LiveAgentOperationsMap } from '@/components/command-centre/live-agent-operations/LiveAgentOperationsMap'
import { ActivityFeedPanel } from '@/components/command-centre/activity/ActivityFeedPanel'
import { DailyCrmDigestPanel } from '@/components/command-centre/digest/DailyCrmDigestPanel'
import { MeshFleetTile } from '@/components/command-centre/mesh-fleet/MeshFleetTile'
import shell from '../shell.module.css'
import styles from '../command-deck.module.css'


export interface OperationsViewProps { dashboard: DashboardSummaryResult; evidence: EvidenceStreamResult; actionQueue: ActionQueueTileData; blockedLanes: BlockedLanesData; crmAutonomy?: React.ReactNode; agentEventsWall: AgentEventsWallResult; serverDataUnavailable?: string; className?: string }

export function OperationsView({ dashboard, evidence, actionQueue, blockedLanes, crmAutonomy, agentEventsWall, serverDataUnavailable, className }: OperationsViewProps) {
  return (
    <MissionControlShell section="operations" title="Operations" className={className}>
      {serverDataUnavailable && <p role="status">{serverDataUnavailable}</p>}

      {/* ── Task queue / approvals — canvas glass chrome (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="task-queue">
        <h2>Task Queue</h2>
        <span className={shell.glassSub}>proposed → approve → queued</span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.02s' }}
      >
        <QueueBoard />
      </section>

      {/* ── CRM auto-execution — system-of-action, dormant behind the kill switch (UNI-2234) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="crm-autonomy">
        <h2>CRM Auto-Execution</h2>
        <span className={shell.glassSub}>approval → lifecycle gate → operator job · dispatch is Board-gated</span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.04s' }}
      >
        {crmAutonomy ?? <p>Authenticated execution policy and recent jobs are unavailable in this environment.</p>}
      </section>

      {/* Consolidated from the retired US command-center page (self-contained panels). */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.06s' }}>
        <LiveAgentOperationsMap />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.08s' }}>
        <ActivityFeedPanel />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.1s' }}>
        <DailyCrmDigestPanel />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.12s' }}>
        <HermesControlPanel />
      </section>

      {/* ── Agent fleet (UNI-2305 Mesh Fleet) — canvas glass chrome (UNI-2339 slice 2).
          Railway Pi-CEO machine heartbeats + ships in flight; tile unchanged. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="agent-fleet">
        <h2>Agent Fleet</h2>
        <span className={shell.glassSub}>Railway Pi-CEO mesh · heartbeats · ships in flight</span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.14s' }}
      >
        <MeshFleetTile />
      </section>

      {/* ── Agent events wall (UNI-2384 wave B2) — runner lifecycle feed over
          cc_agent_events; honest dark/empty states, no fake live signals. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="agent-events-wall">
        <h2>Agent Events Wall</h2>
        <span className={shell.glassSub}>runner lifecycle · claimed → started → draft PR · heartbeats</span>
        {agentEventsWall.source === 'connected' && (
          <span className={shell.glassSrc}>last {agentEventsWall.events.length} events</span>
        )}
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.15s' }}
      >
        <AgentEventsWallTile data={agentEventsWall} nowMs={Date.now()} />
      </section>

      {/* ── Operating System Health (Lane 16) — canvas glass chrome (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="os-health">
        <h2>Operating System Health</h2>
        <span className={shell.glassSrc}>
          {serverDataUnavailable ? 'Source unavailable' : `${dashboard.entries.length} sources · ${dashboard.red_count} red · ${dashboard.amber_count} amber · ${dashboard.green_count} green · ${dashboard.error_count} errors`}
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.16s' }}
      >
        {serverDataUnavailable ? <p>{serverDataUnavailable}</p> : <OperatingHealthTile data={dashboard} />}
      </section>

      {/* ── Live Evidence Stream (Lane 16) — canvas glass chrome (UNI-2339 slice 1) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="evidence-stream">
        <h2>Evidence stream</h2>
        <span className={shell.glassSub}>receipts are first-class · every action leaves a trail</span>
        <span className={shell.glassSrc}>
          {serverDataUnavailable ? 'Source unavailable' : `last ${evidence.entries.length} of ${evidence.total_lines} ledger entries`}
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.18s' }}
      >
        {serverDataUnavailable ? <p>{serverDataUnavailable}</p> : <EvidenceStreamTile data={evidence} />}
      </section>

      {/* ── Action Queue / Today's priorities (Lane 16) — canvas glass chrome (UNI-2339 slice 1) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="action-queue">
        <h2>Today&rsquo;s priorities</h2>
        <span className={shell.glassSub}>decisions, not dashboards</span>
        <span className={shell.glassSrc}>
          {actionQueue.read_error ? 'Source unavailable' : `top ${actionQueue.shown_rows} of ${actionQueue.total_rows} senior-PM actions`}
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.2s' }}
      >
        <ActionQueueTile data={actionQueue} />
      </section>

      {/* ── Blocked Lanes (Lane 16) — canvas glass chrome (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="blocked-lanes">
        <h2>Blocked Lanes</h2>
        <span className={shell.glassSub}>
          {blockedLanes.read_error ? 'Source unavailable' : `${blockedLanes.blocked_count} of ${blockedLanes.total_lanes} lanes need Phill action`}
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.22s' }}
      >
        <BlockedLanesTile data={blockedLanes} />
      </section>

      {/* ── In-Progress PRs (Lane 16.5) — canvas glass chrome (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="in-progress-prs">
        <h2>In-Progress PRs</h2>
        <span className={shell.glassSub}>via <code style={{ fontSize: '0.7rem' }}>GitHub API</code></span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.24s' }}
      >
        <InProgressPRsTile />
      </section>

      {/* ── Operations visibility (UNI-2296) — canvas register (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="operations-visibility">
        <h2>Operations Visibility</h2>
        <span className={shell.glassSub}>Margot state · contractor activity · email roster</span>
      </div>

      <section className={`${styles.integrationGrid} ${styles.reveal}`} style={{ animationDelay: '0.26s' }}>
        <article className={styles.panel}>
          <MargotHealthTile />
        </article>
        <article className={styles.panel}>
          <TeamActivityTile />
        </article>
        <article className={styles.panel}>
          <EmailAccountsTile />
        </article>
      </section>
    </MissionControlShell>
  )
}
