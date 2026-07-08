// src/app/(founder)/founder/command-centre/page.tsx
//
// Nexus Command Deck — flight-deck console for the Unite-Group Nexus.
// Auth enforced by the (founder) layout.

export const dynamic = 'force-dynamic'

import { Chakra_Petch } from 'next/font/google'
import { getProjects, type CommandCentreProject } from '@/lib/command-centre/registry'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { summariseDashboard } from '@/lib/command-centre/dashboard-summary'
import { tailEvidence } from '@/lib/command-centre/evidence-stream'
import { listInProgressPRs } from '@/lib/command-centre/in-progress-prs'
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
import { DailyCrmDigestPanel } from '@/components/command-centre/digest/DailyCrmDigestPanel'
import { MeshFleetTile } from '@/components/command-centre/mesh-fleet/MeshFleetTile'
import { PortfolioHealthTile } from '@/components/command-centre/portfolio-health/PortfolioHealthTile'
import { WikiGraphTile } from '@/components/command-centre/wiki-graph/WikiGraphTile'
import { ProjectIntegrationWorkPacketControl } from './ProjectIntegrationWorkPacketControl'
import { WikiEnhanceControl } from './WikiEnhanceControl'
import { CommandSteps } from './CommandSteps'
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
  // getProjects first (fast local YAML) so the PRs scanner reuses the same
  // repo list instead of re-reading the registry (review finding, UNI-2340).
  const projects = await getProjects()
  const portfolioRepos = [...new Set(projects.map((p) => p.github_repo).filter((r): r is string => !!r))]
  const [tools, dashboard, evidence, actionQueue, blockedLanes, inProgressPRs, user] = await Promise.all([
    getToolCatalogue(),
    summariseDashboard(),
    tailEvidence(),
    loadActionQueueData(),
    loadBlockedLanesData(),
    listInProgressPRs({ repos: portfolioRepos }),
    getUser(),
  ])
  const integrationStatuses = await loadProjectIntegrationStatuses(projects)

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
    <div className={`${chakra.variable} ${styles.deck}`}>
      <CommandPalette
        projects={projects.map((p) => ({ name: p.name, status: p.status, production_url: p.production_url }))}
        tools={tools.map((t) => ({ tool_key: t.tool_key, source: t.source, risk_class: t.risk_class }))}
      />

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

      {/* ── Operations visibility (UNI-2296) ─────────────────────────── */}
      <div className={styles.sectionHead} id="operations-visibility">
        <div className={styles.sectionTitleGroup}>
          <span className={styles.sectionLabel}>Operations Visibility</span>
          <span className={styles.sectionMeta}>Margot state · contractor activity · email roster</span>
        </div>
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

      {/* ── Idea intake ──────────────────────────────────────────────── */}
      <div className={styles.sectionHead} id="idea-intake">
        <span className={styles.sectionLabel}>Idea Intake</span>
        <span className={styles.sectionMeta}>idea → board → queue</span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.02s' }}>
        <IdeaConsole projects={projects.map((p) => ({ name: p.name }))} />
      </section>

      {/* ── Task queue ───────────────────────────────────────────────── */}
      <div className={styles.sectionHead} id="task-queue">
        <span className={styles.sectionLabel}>Task Queue</span>
        <span className={styles.sectionMeta}>proposed → approve → queued</span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.06s' }}>
        <QueueBoard />
      </section>

      {/* ── Wiki knowledge base ──────────────────────────────────────── */}
      <div className={styles.sectionHead} id="wiki-knowledge-base">
        <div className={styles.sectionTitleGroup}>
          <span className={styles.sectionLabel}>Wiki Knowledge Base</span>
          <span className={styles.sectionMeta}>button → queue → Mac runner → wiki-growth report</span>
        </div>
        <WikiEnhanceControl />
      </div>

      {/* ── Portfolio ────────────────────────────────────────────────── */}
      <div className={styles.sectionHead} id="portfolio">
        <span className={styles.sectionLabel}>Portfolio Registry</span>
        <span className={styles.sectionMeta}>{projects.length} units · {activeCount} active</span>
        <span className={styles.sectionCaption}>
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
      {/* UNI-2305 — Mesh Fleet: Railway Pi-CEO machine heartbeats + ships in flight. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.15s' }}>
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
          <div className={styles.sectionHead} id="project-integrations">
            <div className={styles.sectionTitleGroup}>
              <span className={styles.sectionLabel}>Project Integrations</span>
              <span className={styles.sectionMeta}>{integrationStatuses.length} manifests · metadata-only</span>
            </div>
            <ProjectIntegrationWorkPacketControl />
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

      {/* ── Capability bus ───────────────────────────────────────────── */}
      <div className={styles.sectionHead} id="capability-bus">
        <span className={styles.sectionLabel}>Capability Bus</span>
        <span className={styles.sectionMeta}>{tools.length} tools · {Object.keys(sources).length} sources</span>
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

      {/* ── Operating System Health (Lane 16) ─────────────────────────── */}
      <div className={styles.sectionHead} id="os-health">
        <span className={styles.sectionLabel}>Operating System Health</span>
        <span className={styles.sectionMeta}>
          {dashboard.entries.length} sources · {dashboard.red_count} red · {dashboard.amber_count} amber ·{' '}
          {dashboard.green_count} green · {dashboard.error_count} errors
        </span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.12s' }}>
        <OperatingHealthTile data={dashboard} />
      </section>

      {/* ── Live Evidence Stream (Lane 16) ────────────────────────────── */}
      <div className={styles.sectionHead} id="evidence-stream">
        <span className={styles.sectionLabel}>Live Evidence Stream</span>
        <span className={styles.sectionMeta}>
          last {evidence.entries.length} of {evidence.total_lines} ledger entries
        </span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.14s' }}>
        <EvidenceStreamTile data={evidence} />
      </section>

      {/* ── Action Queue (Lane 16) ─────────────────────────────────────── */}
      <div className={styles.sectionHead} id="action-queue">
        <span className={styles.sectionLabel}>Action Queue</span>
        <span className={styles.sectionMeta}>
          top {actionQueue.shown_rows} of {actionQueue.total_rows} senior-PM actions
        </span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.16s' }}>
        <ActionQueueTile data={actionQueue} />
      </section>

      {/* ── Blocked Lanes (Lane 16) ────────────────────────────────────── */}
      <div className={styles.sectionHead} id="blocked-lanes">
        <span className={styles.sectionLabel}>Blocked Lanes</span>
        <span className={styles.sectionMeta}>
          {blockedLanes.blocked_count} of {blockedLanes.total_lanes} lanes need Phill action
        </span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.18s' }}>
        <BlockedLanesTile data={blockedLanes} />
      </section>

      {/* ── In-Progress PRs (Lane 16.5) ─────────────────────────────────── */}
      <div className={styles.sectionHead} id="in-progress-prs">
        <span className={styles.sectionLabel}>In-Progress PRs</span>
        <span className={styles.sectionMeta}>
          {inProgressPRs.available
            ? <>{inProgressPRs.status_message} · via <code style={{ fontSize: '0.7rem' }}>GitHub API</code></>
            : inProgressPRs.status_message}
        </span>
      </div>

      <section className={`${styles.reveal}`} style={{ animationDelay: '0.2s' }}>
        <InProgressPRsTile data={inProgressPRs} />
      </section>

      {/* ── Founder Cockpit (consolidated from the retired /founder/dashboard · UNI-2306) ─ */}
      <div className={styles.sectionHead} id="founder-cockpit">
        <span className={styles.sectionLabel}>Founder Cockpit</span>
        <span className={styles.sectionMeta}>integrations · CRM · revenue · hub health · coaches · experiments</span>
        <span className={styles.sectionCaption}>
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
