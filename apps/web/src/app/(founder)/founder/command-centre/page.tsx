// Founder Mission Control. Auth is enforced by the (founder) layout.
// The desk uses the existing task authority; business and operational sources
// remain available below and on their existing sub-decks.

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { chakra, syne, jbMono } from './fonts'
import { getProjects } from '@/lib/command-centre/registry'
import { resolveDeliveryProjects } from '@/lib/command-centre/delivery-projects'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { loadActionQueueData } from './ActionQueueTile'
import { loadBlockedLanesData } from './BlockedLanesTile'
import { BlockedOnMeTile, loadBlockedOnMeData } from './BlockedOnMeTile'
import { StageBoardTile, loadStageBoardData } from './StageBoardTile'
import { CommandPalette, CommandPaletteTrigger } from './CommandPalette'
import { FounderDesk } from './FounderDesk'
import { MissionControlShell } from './MissionControlShell'
import { getOperationalSourceStatus } from './operational-source-status'
import shell from './shell.module.css'
import styles from './founder-desk.module.css'

/** Pi-Dev-Ops builds view. A plain link: the no-prompt escort needs its login secret, which is founder-held (Q6). */
const PI_DEV_OPS_BUILDS_URL = 'https://pi-dev-ops.vercel.app/builds'

export default async function CommandDeckPage() {
  const [projects, tools, actionQueue, blockedLanes, blockedOnMe, stageBoard] = await Promise.all([
    getProjects(),
    getToolCatalogue(),
    loadActionQueueData(),
    loadBlockedLanesData(),
    loadBlockedOnMeData(),
    loadStageBoardData(),
  ])

  const deliveryProjects = resolveDeliveryProjects(projects)
  const activeCount = projects.filter((project) => project.status === 'active').length
  const sourceCount = new Set(tools.map((tool) => tool.source)).size
  const operationalStatus = getOperationalSourceStatus(actionQueue, blockedLanes)

  return (
    <MissionControlShell section="home" className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} actions={<>
      <a
        className={styles.secondaryButton}
        href={PI_DEV_OPS_BUILDS_URL}
        target="_blank"
        rel="noreferrer"
        data-testid="builds-link"
        title="Opens the Pi-Dev-Ops builds view. It has its own login until the escorted link is authorised (Q6)."
      >
        <b>▶</b> builds
      </a>
      <CommandPaletteTrigger className={styles.secondaryButton} />
    </>}>
      <CommandPalette
        projects={projects.map((project) => ({
          name: project.name,
          status: project.status,
          production_url: project.production_url,
        }))}
        tools={tools.map((tool) => ({
          tool_key: tool.tool_key,
          source: tool.source,
          risk_class: tool.risk_class,
        }))}
      />

      {deliveryProjects.error && <p role="status">{deliveryProjects.error}</p>}
      <FounderDesk projects={deliveryProjects.projects.map(project => ({ name: project.name }))} />

      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`}>
        <h2>Blocked on me</h2>
        <span className={shell.glassSub}>every open founder decision, oldest first · FOUNDER-QUEUE.md</span>
      </div>
      <section className={`${shell.canvasScope} ${shell.glassPanel}`} aria-label="Blocked on me">
        <BlockedOnMeTile data={blockedOnMe} />
      </section>

      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`}>
        <h2>Projects by stage</h2>
        <span className={shell.glassSub}>Planning · Research · Develop · Production · Done — one word per Linear team</span>
      </div>
      <section className={`${shell.canvasScope} ${shell.glassPanel}`} aria-label="Projects by stage">
        <StageBoardTile data={stageBoard} />
      </section>
      <details className={styles.portfolioSummary}>
        <summary>Business and system overview — {operationalStatus.label}</summary>
        <p>These existing work and connection sources remain separate from new delivery missions.</p>
        <p>{operationalStatus.queueUnavailable ? 'Action queue unavailable' : `${actionQueue.total_rows} proposed actions`}. {operationalStatus.blockersUnavailable ? 'Blocked-lane source unavailable' : `${blockedLanes.blocked_count} blocked of ${blockedLanes.total_lanes} lanes`}.</p>
        <p>{projects.length} registered projects, {activeCount} active. {tools.length} catalogue entries from {sourceCount} source labels. Catalogue entries do not establish a connected account.</p>
        <p><Link href="/founder/command-centre/operations#task-queue">Open existing work and approvals</Link></p>
        <p><Link href="/founder/command-centre/providers">View provider connections and usage</Link></p>
      </details>
    </MissionControlShell>
  )
}
