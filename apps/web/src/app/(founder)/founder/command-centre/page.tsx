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
import { CommandPalette, CommandPaletteTrigger } from './CommandPalette'
import { FounderDesk } from './FounderDesk'
import { DeckThemeShell } from './DeckThemeShell'
import { getOperationalSourceStatus } from './operational-source-status'
import styles from './founder-desk.module.css'

export default async function CommandDeckPage() {
  const [projects, tools, actionQueue, blockedLanes] = await Promise.all([
    getProjects(),
    getToolCatalogue(),
    loadActionQueueData(),
    loadBlockedLanesData(),
  ])

  const deliveryProjects = resolveDeliveryProjects(projects)
  const activeCount = projects.filter((project) => project.status === 'active').length
  const sourceCount = new Set(tools.map((tool) => tool.source)).size
  const operationalStatus = getOperationalSourceStatus(actionQueue, blockedLanes)

  return (
    <DeckThemeShell className={`${chakra.variable} ${syne.variable} ${jbMono.variable} ${styles.shell}`}>
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

      <header className={styles.brandRow}>
        <strong>Unite-Group / Mission Control</strong>
        <CommandPaletteTrigger className={styles.secondaryButton} />
      </header>
      {deliveryProjects.error && <p role="status">{deliveryProjects.error}</p>}
      <FounderDesk projects={deliveryProjects.projects.map(project => ({ name: project.name }))} />
      <details className={styles.portfolioSummary}>
        <summary>Business and system overview — {operationalStatus.label}</summary>
        <p>These existing work and connection sources remain separate from new delivery missions.</p>
        <p>{operationalStatus.queueUnavailable ? 'Action queue unavailable' : `${actionQueue.total_rows} proposed actions`}. {operationalStatus.blockersUnavailable ? 'Blocked-lane source unavailable' : `${blockedLanes.blocked_count} blocked of ${blockedLanes.total_lanes} lanes`}.</p>
        <p>{projects.length} registered projects, {activeCount} active. {tools.length} catalogue entries from {sourceCount} source labels. Catalogue entries do not establish a connected account.</p>
        <p><Link href="/founder/command-centre/operations#task-queue">Open existing work and approvals</Link></p>
        <p><Link href="/founder/command-centre/providers">View provider connections and usage</Link></p>
      </details>
    </DeckThemeShell>
  )
}
