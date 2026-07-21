// src/app/(founder)/founder/command-centre/portfolio/page.tsx
//
// Portfolio deck (UNI-2378 wave 1) — the Operate launch pad, Pipeline,
// Portfolio Registry, Project Integrations and Founder Cockpit tiles
// RELOCATED wholesale from the main command deck when it went calm-cockpit.
// Every tile renders exactly as it did on page.tsx; only the route moved.
// Deck register mirrors hermes-control-panel/page.tsx (fonts + styles.deck +
// shell tokens). Auth enforced by the (founder) layout.

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Chakra_Petch, Syne, JetBrains_Mono } from 'next/font/google'
import { getProjects, type CommandCentreProject } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { getUser } from '@/lib/supabase/server'
import { BUSINESSES } from '@/lib/businesses'
import { PipelineBoard } from '@/components/command-centre/pipeline/PipelineBoard'
import { loadPipelineOpportunities } from '@/lib/command-centre/pipeline-opportunities'
import { RepoCampaignsTile } from '@/components/command-centre/repo-campaigns/RepoCampaignsTile'
import { BusinessFocusRail } from '@/components/command-centre/business-focus/BusinessFocusRail'
import { PortfolioHealthTile } from '@/components/command-centre/portfolio-health/PortfolioHealthTile'
import { DeckMoreLine, DECK_LIST_CAP } from '@/components/command-centre/DeckDetails'
// Founder cockpit tiles — consolidated from the retired /founder/dashboard (UNI-2306)
// so the command deck is the one canonical console. Surface move: data routes unchanged.
import { KPIGrid } from '@/components/founder/dashboard/KPIGrid'
import { IntegrationStatus } from '@/components/founder/dashboard/IntegrationStatus'
import { FounderStats } from '@/components/founder/dashboard/FounderStats'
import { CoachBriefs } from '@/components/founder/dashboard/CoachBriefs'
import { ExperimentsDashboardWidget } from '@/components/founder/dashboard/ExperimentsDashboardWidget'
import { HubStatusWidget } from '@/components/founder/dashboard/HubStatusWidget'
import { DeckThemeShell } from '../DeckThemeShell'
import { ProjectIntegrationWorkPacketControl } from '../ProjectIntegrationWorkPacketControl'
import { swatchFor, ledState, connectionLedState, hostOf } from '../deck-visual-helpers'
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

export default async function PortfolioDeckPage() {
  const projects = await getProjects()
  const [integrationStatuses, user] = await Promise.all([
    loadProjectIntegrationStatuses(projects),
    getUser(),
  ])
  // Needs user.id from the batch above, so it runs after. Degrades honestly
  // (empty board + 'degraded' badge) when the session or query is unavailable.
  const pipeline = await loadPipelineOpportunities(user?.id ?? null)

  const activeCount = projects.filter((p) => p.status === 'active').length

  return (
    <DeckThemeShell className={`${chakra.variable} ${syne.variable} ${jbMono.variable} ${styles.deck}`}>
      <Link href="/founder/command-centre" className={styles.plink}>
        &larr; Command deck
      </Link>

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
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.06s' }}>
        <RepoCampaignsTile />
      </section>

      {/* Consolidated from the retired US command-center page (self-contained panel). */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.08s' }}>
        <BusinessFocusRail />
      </section>

      {/* UNI-2201 — Portfolio Health: live CI + P0/P1 health across RA / Synthex / Nexus, red/yellow/green, 60s refresh. */}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.1s' }}>
        <PortfolioHealthTile />
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
                  // Founder feedback 14/07/2026 — cap the per-manifest connection
                  // dump; the card already leads with the usable/blocked/mock
                  // summary counts above.
                  <div className={styles.connectionList}>
                    {status.connections.slice(0, DECK_LIST_CAP).map((connection) => (
                      <div key={connection.id} className={styles.connectionRow}>
                        <span className={styles.led} data-state={connectionLedState(connection.state)} />
                        <span className={styles.connectionName}>{connection.label}</span>
                        <span className={styles.connectionState}>{connection.state}</span>
                      </div>
                    ))}
                    <DeckMoreLine
                      total={status.connections.length}
                      shown={Math.min(status.connections.length, DECK_LIST_CAP)}
                    />
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

      {/* ── Founder Cockpit (consolidated from the retired /founder/dashboard · UNI-2306) —
          canvas head (UNI-2339 slice 2). The cockpit tiles keep their own opaque
          light-card grounds (dark-on-light internally) — deep restyling is out of
          scope; the canvas ground around them is the migration. ── */}
      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`} id="founder-cockpit">
        <h2>Founder Cockpit</h2>
        <span className={shell.glassSub}>integrations · CRM · revenue · hub health · coaches · experiments</span>
        <span className={shell.glassCaption}>
          Consolidated from the retired <code style={{ fontSize: '0.7rem' }}>/founder/dashboard</code> so this
          deck is the one canonical console. Each tile renders its own live source and error state.
        </span>
      </div>

      {user && (
        <section className={`${styles.reveal}`} style={{ animationDelay: '0.12s' }}>
          <IntegrationStatus founderId={user.id} />
        </section>
      )}
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.14s' }}>
        <FounderStats />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.16s' }}>
        <KPIGrid />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.18s' }}>
        <HubStatusWidget />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.2s' }}>
        <CoachBriefs />
      </section>
      <section className={`${styles.reveal}`} style={{ animationDelay: '0.22s' }}>
        <ExperimentsDashboardWidget />
      </section>
    </DeckThemeShell>
  )
}
