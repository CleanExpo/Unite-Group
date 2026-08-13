// Nexus Command Centre — North Star distillation.
// Auth is enforced by the (founder) layout. This home is intentionally one
// calm control surface: status, one selected operational object, six domain
// summaries, then the existing governed idea intake. Dense detail stays on
// the linked sub-decks.

export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from './fonts'
import { getProjects } from '@/lib/command-centre/registry'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { loadActionQueueData } from './ActionQueueTile'
import { loadBlockedLanesData } from './BlockedLanesTile'
import { LiveClock } from './LiveClock'
import { CommandPalette } from './CommandPalette'
import { IdeaConsole } from './IdeaConsole'
import { SixMonitorCanvas } from './SixMonitorCanvas'
import shell from './shell.module.css'
import styles from './command-deck.module.css'

export default async function CommandDeckPage() {
  const [projects, tools, actionQueue, blockedLanes] = await Promise.all([
    getProjects(),
    getToolCatalogue(),
    loadActionQueueData(),
    loadBlockedLanesData(),
  ])

  const activeCount = projects.filter((project) => project.status === 'active').length
  const sourceCount = new Set(tools.map((tool) => tool.source)).size
  const sourceUnavailable = Boolean(actionQueue.read_error || blockedLanes.read_error)

  return (
    <div className={`${chakra.variable} ${syne.variable} ${jbMono.variable} ${styles.deck}`}>
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

      <header className={styles.statusStrip}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>NX</span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>Mission Control</span>
            <span className={styles.brandSub}>Unite-Group Nexus</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LiveClock className={styles.clock} />
          <span className={styles.clockLabel}>AEST</span>
        </div>

        <span className={styles.sys}>
          <span className={styles.led} data-state={sourceUnavailable ? 'stub' : 'active'} />
          <span className={styles.sysText}>
            {sourceUnavailable ? 'Some sources unavailable' : 'Authenticated source reads'}
          </span>
        </span>

        <span className={styles.kbd}>
          <b>⌘K</b> command
        </span>
      </header>

      <SixMonitorCanvas
        actionQueue={actionQueue}
        blockedLanes={blockedLanes}
        projectCount={projects.length}
        activeProjectCount={activeCount}
        toolCount={tools.length}
        sourceCount={sourceCount}
      />

      <div className={`${shell.canvasScope} ${shell.glassSectionHead}`}>
        <h2>Quick command</h2>
        <span className={shell.glassSub}>idea → proposed task → Board approval</span>
      </div>
      <IdeaConsole projects={projects.map((project) => ({ name: project.name }))} />
    </div>
  )
}
