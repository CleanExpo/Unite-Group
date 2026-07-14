// src/app/(founder)/founder/command-centre/page.tsx
//
// Nexus Command Deck — flight-deck console for the Unite-Group Nexus.
// Auth enforced by the (founder) layout.

export const dynamic = 'force-dynamic'

import { Chakra_Petch, Syne, JetBrains_Mono } from 'next/font/google'
import { getProjects, type CommandCentreProject } from '@/lib/command-centre/registry'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { summariseDashboard } from '@/lib/command-centre/dashboard-summary'
import { loadDashboardHealthFromSupabase } from '@/lib/command-centre/dashboard-health-supabase'
import { tailEvidence } from '@/lib/command-centre/evidence-stream'
import { loadEvidenceLedgerFromSupabase } from '@/lib/command-centre/evidence-ledger-supabase'
import { loadCrmMissionControlJobs } from '@/lib/command-centre/crm-mission-control-jobs-supabase'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { loadActionQueueData } from './ActionQueueTile'
import { loadBlockedLanesData } from './BlockedLanesTile'
import { LiveClock } from './LiveClock'
import { CommandPalette } from './CommandPalette'
import { IdeaConsole } from './IdeaConsole'
import { QueueBoard } from './QueueBoard'
import { DigestBanner } from './DigestBanner'
import { OperatingHealthTile } from './OperatingHealthTile'
import { EvidenceStreamTile } from './EvidenceStreamTile'
import { ActionQueueTile } from './ActionQueueTile'
import { BlockedLanesTile } from './BlockedLanesTile'
import { InProgressPRsTile } from './InProgressPRsTile'
import { RepoCampaignsTile } from '@/components/command-centre/repo-campaigns/RepoCampaignsTile'
import { ProviderAccountsTile } from '@/components/command-centre/provider-accounts/ProviderAccountsTile'
import { MargotHealthTile } from '@/components/command-centre/margot-health/MargotHealthTile'
import { TeamActivityTile } from '@/components/command-centre/team-activity/TeamActivityTile'
import { EmailAccountsTile } from '@/components/command-centre/email-accounts/EmailAccountsTile'
// Consolidated from the retired US-spelling command-center page (self-contained panels).
import { HermesControlPanel } from '@/components/command-centre/control-panel/HermesControlPanel'
import { BusinessFocusRail } from '@/components/command-centre/business-focus/BusinessFocusRail'
import { LiveAgentOperationsMap } from '@/components/command-centre/live-agent-operations/LiveAgentOperationsMap'
import { ProviderUsageCockpit } from '@/components/command-centre/provider-usage/ProviderUsageCockpit'
import { ActivityFeedPanel } from '@/components/command-centre/activity/ActivityFeedPanel'
import { CrmAutonomyPanel } from '@/components/command-centre/crm-autonomy/CrmAutonomyPanel'
import { DailyCrmDigestPanel } from '@/components/command-centre/digest/DailyCrmDigestPanel'
import { MeshFleetTile } from '@/components/command-centre/mesh-fleet/MeshFleetTile'
import { PortfolioHealthTile } from '@/components/command-centre/portfolio-health/PortfolioHealthTile'
import { WikiGraphTile } from '@/components/command-centre/wiki-graph/WikiGraphTile'
import { CostAllocationTile } from '@/components/command-centre/cost-allocation/CostAllocationTile'
import { ProjectIntegrationWorkPacketControl } from './ProjectIntegrationWorkPacketControl'
import { WikiEnhanceControl } from './WikiEnhanceControl'
import { CommandSteps } from './CommandSteps'
// UNI-2339 slice 1 — canvas shell: hero band + glass chrome for the
// Priorities (Action Queue) and Evidence Stream sections. Fonts scoped to
// this route only via next/font/google variables (see shell.module.css).
import { HeroBand } from './HeroBand'
import shell from './shell.module.css'
// UNI-2339 slice 2 — Operate launch-pad (static BUSINESSES registry),
// PipelineBoard revived read-only (server-side crm_opportunities read, no
// new API route), and the remaining deck sections migrated onto the canvas
// register (command-deck.module.css ground flips dark; tiles unchanged).
import { BUSINESSES } from '@/lib/businesses'
import { PipelineBoard } from '@/components/command-centre/pipeline/PipelineBoard'
import { loadPipelineOpportunities } from '@/lib/command-centre/pipeline-opportunities'
// Founder cockpit tiles — consolidated from the retired /founder/dashboard (UNI-2306)
// so the command deck is the one canonical console. Surface move: data routes unchanged.
import { getUser } from '@/lib/supabase/server'
import { KPIGrid } from '@/components/founder/dashboard/KPIGrid'
import { IntegrationStatus } from '@/components/founder/dashboard/IntegrationStatus'
import { FounderStats } from '@/components/founder/dashboard/FounderStats'
import { CoachBriefs } from '@/components/founder/dashboard/CoachBriefs'
import { ExperimentsDashboardWidget } from '@/components/founder/dashboard/ExperimentsDashboardWidget'
import { HubStatusWidget } from '@/components/founder/dashboard/HubStatusWidget'
import styles from './command-deck.module.css'

const chakra = Chakra_Petch({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-chakra',
  display: 'swap',
})

// UNI-2339 slice 1 — canvas register typography (Syne display + JetBrains
// Mono data/KPIs), scoped to this route via CSS variables consumed only by
// shell.module.css. Does not replace Chakra_Petch, which the rest of the
// (unmigrated) deck still uses this slice.
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

// Stable per-project accent (instrument swatch) — purely visual brand separation.
const BRAND_SWATCH: Record<string, string> = {
  'Unite-Hub': '#16a34a',
  RestoreAssist: '#34d399',
  Synthex: '#f97316',
  'Disaster-Recovery': '#fb7185',
  'DR-NRPG': '#f97316',
  'ATO-APP': '#facc15',
  'Dimitri-ITR': '#6366f1',
  'CCW-CRM': '#16a34a',
  'Authority-Site': '#16a34a',
  'Nexus-Hub': '#16a34a',
  'Pi-CEO-Dev': '#4ade80',
  CARSI: '#f97316',
}
function swatchFor(name: string): string {
  if (BRAND_SWATCH[name]) return BRAND_SWATCH[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `hsl(${h} 80% 62%)`
}

const RISK_RAIL: Record<string, string> = {
  read: '#16a34a',
  'write-local': '#34d399',
  'write-shared': '#fbbf24',
  external: '#fb923c',
  destructive: '#f87171',
}
function railFor(risk: string): string {
  return RISK_RAIL[risk] ?? '#6f879b'
}

function ledState(status: string): 'active' | 'stub' | 'idle' {
  if (status === 'active') return 'active'
  if (status === 'stub') return 'stub'
  return 'idle'
}

function connectionLedState(state: string): 'active' | 'stub' | 'idle' {
  if (state === 'connected' || state === 'ready') return 'active'
  if (state === 'mock' || state === 'unknown') return 'stub'
  return 'idle'
}

function hostOf(url?: string): string {
  return url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''
}

export default async function CommandDeckPage() {
  const projects = await getProjects()
  const [tools, dashboard, evidence, actionQueue, blockedLanes, user] = await Promise.all([
    getToolCatalogue(),
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
  const integrationStatuses = await loadProjectIntegrationStatuses(projects)
  // Needs user.id from the batch above, so it runs after. Degrades honestly
  // (empty board + 'degraded' badge) when the session or query is unavailable.
  const pipeline = await loadPipelineOpportunities(user?.id ?? null)
  // Recent CRM Mission Control jobs (UNI-2234 slice 3). Founder-scoped; degrades
  // honestly (not_connected / error) when the session or query is unavailable.
  const crmMissionControlJobs = await loadCrmMissionControlJobs(user?.id ?? null)

  const activeCount = projects.filter((p) => p.status === 'active').length
  const sources = tools.reduce<Record<string, number>>((acc, t) => {
    acc[t.source] = (acc[t.source] ?? 0) + 1
    return acc
  }, {})
  const pad2 = (n: number) => String(n).padStart(2, '0')
  // Deck state: degraded if any integration manifest failed to load, otherwise ready.
  const hasDegradedManifest = integrationStatuses.some((s) => !s.ok)
  const deckState = hasDegradedManifest ? 'stub' : 'active'
  const deckLabel = hasDegradedManifest ? 'Some manifests degraded' : 'Deck loaded'

  return (
    <div className={`${chakra.variable} ${syne.variable} ${jbMono.variable} ${styles.deck}`}>
      <CommandPalette
        projects={projects.map((p) => ({ name: p.name, status: p.status, production_url: p.production_url }))}
        tools={tools.map((t) => ({ tool_key: t.tool_key, source: t.source, risk_class: t.risk_class }))}
      />

      {/* ── Canvas shell hero band (UNI-2339 slice 1) ─────────────────── */}
      <HeroBand data={actionQueue} />

      {/* ── Operate launch-pad (UNI-2339 slice 2) — static BUSINESSES registry.
          The registry carries name/type/status/repoUrl only (no purpose field),
          so the tiles show exactly that — nothing invented. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="operate-launch-pad">
        <h2>Operate</h2>
        <span className={shell.glassSub}>portfolio launch pad</span>
        <span className={shell.glassSrc}>{BUSINESSES.length} businesses · static registry</span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.02s' }}
      >
        <div className={shell.launchGrid}>
          {BUSINESSES.map((business) => (
            <article
              key={business.key}
              className={shell.launchTile}
              style={{ '--swatch': business.color } as React.CSSProperties}
              data-testid={`launch-tile-${business.key}`}
            >
              <span className={shell.launchName}>{business.name}</span>
              <span className={shell.launchMeta}>
                {business.type} · {business.status}
              </span>
              <a
                className={shell.launchLink}
                href={business.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                ↗ {hostOf(business.repoUrl)}
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* ── Pipeline (UNI-2339 slice 2) — PipelineBoard revived READ-ONLY.
          Founder-scoped crm_opportunities read runs server-side (same query
          the /api/founder/opportunities route makes — no new route). No
          onSelectOpportunity handler is wired: stage change stays
          approval-gated, per the board's own contract. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="pipeline">
        <h2>Pipeline</h2>
        <span className={shell.glassSub}>read-only · stage change is approval-gated</span>
        <span className={shell.glassSrc}>
          crm_opportunities · forecast only
          {pipeline.excludedCount > 0 &&
            ` · ${pipeline.opportunities.length} open · ${pipeline.excludedCount} lost/parked excluded`}
        </span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.04s' }}
      >
        <PipelineBoard
          opportunities={pipeline.opportunities}
          source={pipeline.source}
          sourceLabel="crm_opportunities"
          lastUpdatedAt={pipeline.lastUpdatedAt}
        />
      </section>

      <details id="system-detail" className={styles.systemDetail} open>
        <summary className={styles.systemSummary}>Mission Control deck — live agents, queues, approvals, repos &amp; logs (click to collapse)</summary>

      {/* ── Status strip ─────────────────────────────────────────────── */}
      <header className={`${styles.statusStrip} ${styles.reveal}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>NX</span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>Nexus Command</span>
            <span className={styles.brandSub}>Unite-Group // Command Deck</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LiveClock className={styles.clock} />
          <span className={styles.clockLabel}>Mission Time · AEST</span>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{pad2(projects.length)}</span>
            <span className={styles.metricLabel}>Projects</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue} data-tone="go">{pad2(activeCount)}</span>
            <span className={styles.metricLabel}>Active</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{pad2(tools.length)}</span>
            <span className={styles.metricLabel}>Tools</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{pad2(Object.keys(sources).length)}</span>
            <span className={styles.metricLabel}>Sources</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <span className={styles.sys}>
            <span className={styles.led} data-state={deckState} />
            <span className={styles.sysText}>{deckLabel}</span>
          </span>
          <span className={styles.kbd}>
            <b>⌘K</b> command palette
          </span>
        </div>
      </header>

      {/* ── Morning digest ───────────────────────────────────────────── */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.01s' }}>
        <DigestBanner />
      </section>

      {/* ── Operations visibility (UNI-2296) — canvas register (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="operations-visibility">
        <h2>Operations Visibility</h2>
        <span className={shell.glassSub}>Margot state · contractor activity · email roster</span>
      </div>

      <section className={`${styles.integrationGrid} ${styles.reveal}`} style={{ animationDelay: '0.015s' }}>
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

      {/* ── Idea intake — canvas register (UNI-2339 slice 2) ─────────── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="idea-intake">
        <h2>Idea Intake</h2>
        <span className={shell.glassSub}>idea → board → queue</span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.02s' }}>
        <IdeaConsole projects={projects.map((p) => ({ name: p.name }))} />
      </section>

      {/* ── Task queue / approvals — canvas glass chrome (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="task-queue">
        <h2>Task Queue</h2>
        <span className={shell.glassSub}>proposed → approve → queued</span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.06s' }}
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
        style={{ animationDelay: '0.065s' }}
      >
        <CrmAutonomyPanel recentJobs={crmMissionControlJobs} />
      </section>

      {/* ── Wiki knowledge base — canvas register (UNI-2339 slice 2) ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="wiki-knowledge-base">
        <h2>Wiki Knowledge Base</h2>
        <span className={shell.glassSub}>button → queue → Mac runner → wiki-growth report</span>
        <div className={shell.glassHeadTools}>
          <WikiEnhanceControl />
        </div>
      </div>

      {/* ── Portfolio — canvas register (UNI-2339 slice 2) ───────────── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="portfolio">
        <h2>Portfolio Registry</h2>
        <span className={shell.glassSub}>{projects.length} units · {activeCount} active</span>
        <span className={shell.glassCaption}>
          Declared from the static project registry — status is each project&apos;s
          configured lifecycle state (active / stub / paused), not a live health probe.
        </span>
      </div>

      {/* Live "campaigns" view — repos with open PRs / recent commits = agents at work. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.07s' }}>
        <RepoCampaignsTile />
      </section>

      {/* The LLM provider pool — register plans, see live routing state. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.08s' }}>
        <ProviderAccountsTile />
      </section>

      {/* AI provider capacity — usage meters next to the accounts pool. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.09s' }}>
        <ProviderUsageCockpit />
      </section>

      {/* Cost allocation — metering spend per source vs revenue, current month. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.095s' }}>
        <CostAllocationTile />
      </section>

      {/* Consolidated from the retired US command-center page (self-contained panels). */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.10s' }}>
        <BusinessFocusRail />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.11s' }}>
        <HermesControlPanel />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.12s' }}>
        <LiveAgentOperationsMap />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.13s' }}>
        <ActivityFeedPanel />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.14s' }}>
        <DailyCrmDigestPanel />
      </section>
      {/* ── Agent fleet (UNI-2305 Mesh Fleet) — canvas glass chrome (UNI-2339 slice 2).
          Railway Pi-CEO machine heartbeats + ships in flight; tile unchanged. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="agent-fleet">
        <h2>Agent Fleet</h2>
        <span className={shell.glassSub}>Railway Pi-CEO mesh · heartbeats · ships in flight</span>
      </div>

      <section
        className={`${shell.canvasScope} ${shell.glassPanel} ${shell.glassSection} ${styles.reveal}`}
        style={{ animationDelay: '0.15s' }}
      >
        <MeshFleetTile />
      </section>

      {/* UNI-2201 — Portfolio Health: live CI + P0/P1 health across RA / Synthex / Nexus, red/yellow/green, 60s refresh. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.155s' }}>
        <PortfolioHealthTile />
      </section>

      {/* Wiki Graph (UNI-2304) — knowledge-base graph summary + link to full view. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.16s' }}>
        <WikiGraphTile />
      </section>

      <section className={styles.panelGrid}>
        {projects.map((project: CommandCentreProject, i: number) => (
          <article
            key={project.name}
            className={`${styles.panel} ${styles.reveal}`}
            style={{ '--swatch': swatchFor(project.name), animationDelay: `${0.04 * i}s` } as React.CSSProperties}
          >
            <div className={styles.panelHead}>
              <span className={styles.led} data-state={ledState(project.status)} />
              <span className={styles.pname}>{project.name}</span>
              <span className={styles.statusTag}>{project.status}</span>
            </div>

            <p className={styles.ppurpose}>{project.business_purpose}</p>

            <div className={styles.readouts}>
              <div className={styles.readout}>
                <span className={styles.readoutKey}>Deploy</span>
                <span className={styles.readoutVal}>{project.deployment_target}</span>
              </div>
              <div className={styles.readout}>
                <span className={styles.readoutKey}>Linear</span>
                <span className={styles.readoutVal}>{project.linear_prefix}-*</span>
              </div>
              {project.github_repo && (
                <div className={styles.readout}>
                  <span className={styles.readoutKey}>Repo</span>
                  <span className={styles.readoutVal}>{project.github_repo}</span>
                </div>
              )}
              {project.production_url && (
                <a
                  className={styles.plink}
                  href={project.production_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗ {hostOf(project.production_url)}
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      {/* ── Project integrations ─────────────────────────────────────── */}
      {integrationStatuses.length > 0 && (
        <>
          <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="project-integrations">
            <h2>Project Integrations</h2>
            <span className={shell.glassSub}>{integrationStatuses.length} manifests · metadata-only</span>
            <div className={shell.glassHeadTools}>
              <ProjectIntegrationWorkPacketControl />
            </div>
          </div>

          <section className={styles.integrationGrid}>
            {integrationStatuses.map((status, i) => (
              <article
                key={status.projectName}
                className={`${styles.panel} ${styles.reveal}`}
                style={{ '--swatch': swatchFor(status.projectName), animationDelay: `${0.04 * i}s` } as React.CSSProperties}
              >
                <div className={styles.panelHead}>
                  <span className={styles.led} data-state={status.ok ? 'active' : 'idle'} />
                  <span className={styles.pname}>{status.projectName}</span>
                  <span className={styles.statusTag}>{status.ok ? 'manifest' : 'degraded'}</span>
                </div>

                <div className={styles.integrationSummary}>
                  <span><b>{status.summary.connected + status.summary.ready}</b> usable</span>
                  <span><b>{status.summary.blocked}</b> blocked</span>
                  <span><b>{status.summary.mock}</b> mock</span>
                  <span><b>{status.summary.unknown}</b> unknown</span>
                </div>

                {status.error ? (
                  <p className={styles.ppurpose}>Manifest unavailable: {status.error}</p>
                ) : (
                  <div className={styles.connectionList}>
                    {status.connections.map((connection) => (
                      <div key={connection.id} className={styles.connectionRow}>
                        <span className={styles.led} data-state={connectionLedState(connection.state)} />
                        <span className={styles.connectionName}>{connection.label}</span>
                        <span className={styles.connectionState}>{connection.state}</span>
                      </div>
                    ))}
                  </div>
                )}

                <a className={styles.plink} href={status.statusUrl} target="_blank" rel="noopener noreferrer">
                  ↗ manifest
                </a>
              </article>
            ))}
          </section>
        </>
      )}

      {/* ── Capability bus — canvas register (UNI-2339 slice 2) ──────── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="capability-bus">
        <h2>Capability Bus</h2>
        <span className={shell.glassSub}>{tools.length} tools · {Object.keys(sources).length} sources</span>
      </div>

      <section className={`${styles.bus} ${styles.reveal}`} style={{ animationDelay: '0.1s' }}>
        <div className={styles.busTop}>
          <div className={styles.sources}>
            {Object.entries(sources).map(([source, count]) => (
              <span key={source} className={styles.sourceChip}>
                {source} <b>{count}</b>
              </span>
            ))}
          </div>
          <span className={styles.stamp}>
            <span className={styles.led} data-state="active" />
            List-only · no execution
          </span>
        </div>

        <div className={styles.toolGrid}>
          {tools.map((tool) => (
            <div
              key={tool.tool_key}
              className={styles.toolRow}
              style={{ '--rail': railFor(tool.risk_class) } as React.CSSProperties}
            >
              <div style={{ minWidth: 0 }}>
                <div className={styles.toolKey}>{tool.tool_key}</div>
                <div className={styles.toolDesc}>{tool.description}</div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <span className={styles.riskTag}>{tool.risk_class}</span>
                {tool.approval_required && <span className={styles.approval}>approval</span>}
              </div>
            </div>
          ))}
        </div>
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
        style={{ animationDelay: '0.12s' }}
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
        style={{ animationDelay: '0.14s' }}
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
        style={{ animationDelay: '0.16s' }}
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
        style={{ animationDelay: '0.18s' }}
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
        style={{ animationDelay: '0.2s' }}
      >
        <InProgressPRsTile />
      </section>

      {/* ── Founder Cockpit (consolidated from the retired /founder/dashboard · UNI-2306) —
          canvas head (UNI-2339 slice 2). The cockpit tiles keep their own opaque
          light-card grounds (dark-on-light internally) — deep restyling is out of
          slice-2 scope; the canvas ground around them is the migration. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="founder-cockpit">
        <h2>Founder Cockpit</h2>
        <span className={shell.glassSub}>integrations · CRM · revenue · hub health · coaches · experiments</span>
        <span className={shell.glassCaption}>
          Consolidated from the retired <code style={{ fontSize: '0.7rem' }}>/founder/dashboard</code> so this
          deck is the one canonical console. Each tile renders its own live source and error state.
        </span>
      </div>

      {user && (
        <section className={`${styles.reveal}`} style={{ animationDelay: '0.22s' }}>
          <IntegrationStatus founderId={user.id} />
        </section>
      )}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.24s' }}>
        <FounderStats />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.26s' }}>
        <KPIGrid />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.28s' }}>
        <HubStatusWidget />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.3s' }}>
        <CoachBriefs />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.32s' }}>
        <ExperimentsDashboardWidget />
      </section>
      </details>

      {/* 1-2-3 guided actions now sit below the live deck (founder lead-with-ops). */}
      <CommandSteps />
    </div>
  )
}
