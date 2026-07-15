// src/app/(founder)/founder/command-centre/operations/page.tsx
//
// Operations deck (UNI-2378 wave 1) — the live agent / queue / approvals /
// health tiles RELOCATED wholesale from the main command deck when it went
// calm-cockpit. Every tile renders exactly as it did on page.tsx; only the
// route moved. Deck register mirrors hermes-control-panel/page.tsx (fonts +
// styles.deck + shell tokens). Auth enforced by the (founder) layout.

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Chakra_Petch, Syne, JetBrains_Mono } from 'next/font/google'
import { summariseDashboard } from '@/lib/command-centre/dashboard-summary'
import { loadDashboardHealthFromSupabase } from '@/lib/command-centre/dashboard-health-supabase'
import { tailEvidence } from '@/lib/command-centre/evidence-stream'
import { loadEvidenceLedgerFromSupabase } from '@/lib/command-centre/evidence-ledger-supabase'
import { loadCrmMissionControlJobs } from '@/lib/command-centre/crm-mission-control-jobs-supabase'
import { getUser } from '@/lib/supabase/server'
import { QueueBoard } from '../QueueBoard'
import { OperatingHealthTile } from '../OperatingHealthTile'
import { EvidenceStreamTile } from '../EvidenceStreamTile'
import { ActionQueueTile, loadActionQueueData } from '../ActionQueueTile'
import { BlockedLanesTile, loadBlockedLanesData } from '../BlockedLanesTile'
import { InProgressPRsTile } from '../InProgressPRsTile'
import { MargotHealthTile } from '@/components/command-centre/margot-health/MargotHealthTile'
import { TeamActivityTile } from '@/components/command-centre/team-activity/TeamActivityTile'
import { EmailAccountsTile } from '@/components/command-centre/email-accounts/EmailAccountsTile'
import { HermesControlPanel } from '@/components/command-centre/control-panel/HermesControlPanel'
import { LiveAgentOperationsMap } from '@/components/command-centre/live-agent-operations/LiveAgentOperationsMap'
import { ActivityFeedPanel } from '@/components/command-centre/activity/ActivityFeedPanel'
import { CrmAutonomyPanel } from '@/components/command-centre/crm-autonomy/CrmAutonomyPanel'
import { DailyCrmDigestPanel } from '@/components/command-centre/digest/DailyCrmDigestPanel'
import { MeshFleetTile } from '@/components/command-centre/mesh-fleet/MeshFleetTile'
import shell from '../shell.module.css'
import styles from '../command-deck.module.css'

const chakra = Chakra_Petch({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-chakra',
  display: 'swap',
})
const syne = Syne({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})
const jbMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
})

export default async function OperationsDeckPage() {
  const [dashboard, evidence, actionQueue, blockedLanes, user] = await Promise.all([
    // UNI-2229: cloud substrate first (works on Vercel); local .agentic_nexus
    // dir remains the dev fallback when the table is unreachable or empty.
    (async () => {
      const cloud = await loadDashboardHealthFromSupabase()
      if (cloud.ok && cloud.result.entries.length > 0) return cloud.result
      return summariseDashboard()
    })(),
    // UNI-2227: cloud substrate first (works on Vercel); local ledger tail
    // remains the dev fallback when the table is unreachable or empty.
    (async () => {
      const cloud = await loadEvidenceLedgerFromSupabase()
      if (cloud.ok && cloud.result.entries.length > 0) return cloud.result
      return tailEvidence()
    })(),
    loadActionQueueData(),
    loadBlockedLanesData(),
    getUser(),
  ])
  // Recent CRM Mission Control jobs (UNI-2234 slice 3). Founder-scoped; degrades
  // honestly (not_connected / error) when the session or query is unavailable.
  const crmMissionControlJobs = await loadCrmMissionControlJobs(user?.id ?? null)

  return (
    <div className={`${chakra.variable} ${syne.variable} ${jbMono.variable} ${styles.deck}`}>
      <Link href="/founder/command-centre" className={styles.plink}>
        &larr; Command deck
      </Link>

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
        <CrmAutonomyPanel recentJobs={crmMissionControlJobs} />
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

      {/* ── Operating System Health (Lane 16) — canvas glass chrome (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="os-health">
        <h2>Operating System Health</h2>
        <span className={shell.glassSrc}>
          {dashboard.entries.length} sources · {dashboard.red_count} red · {dashboard.amber_count} amber ·{' '}
          {dashboard.green_count} green · {dashboard.error_count} errors
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.16s' }}
      >
        <OperatingHealthTile data={dashboard} />
      </section>

      {/* ── Live Evidence Stream (Lane 16) — canvas glass chrome (UNI-2339 slice 1) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="evidence-stream">
        <h2>Evidence stream</h2>
        <span className={shell.glassSub}>receipts are first-class · every action leaves a trail</span>
        <span className={shell.glassSrc}>
          last {evidence.entries.length} of {evidence.total_lines} ledger entries
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.18s' }}
      >
        <EvidenceStreamTile data={evidence} />
      </section>

      {/* ── Action Queue / Today's priorities (Lane 16) — canvas glass chrome (UNI-2339 slice 1) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="action-queue">
        <h2>Today&rsquo;s priorities</h2>
        <span className={shell.glassSub}>decisions, not dashboards</span>
        <span className={shell.glassSrc}>
          top {actionQueue.shown_rows} of {actionQueue.total_rows} senior-PM actions
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
          {blockedLanes.blocked_count} of {blockedLanes.total_lanes} lanes need Phill action
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
    </div>
  )
}
