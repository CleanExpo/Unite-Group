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
import { BlockedOnMeTile, loadBlockedOnMeData } from './BlockedOnMeTile'
import { StageBoardTile, loadStageBoardData } from './StageBoardTile'
import { LiveClock } from './LiveClock'
import { CommandPalette, CommandPaletteTrigger } from './CommandPalette'
import { IdeaConsole } from './IdeaConsole'
import { SixMonitorCanvas } from './SixMonitorCanvas'
import { getOperationalSourceStatus } from './operational-source-status'
import shell from './shell.module.css'
import styles from './command-deck.module.css'

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

  const activeCount = projects.filter((project) => project.status === 'active').length
  const sourceCount = new Set(tools.map((tool) => tool.source)).size
  const operationalStatus = getOperationalSourceStatus(actionQueue, blockedLanes)

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
          <span className={styles.led} data-state={operationalStatus.unavailable ? 'stub' : 'active'} />
          <span className={styles.sysText}>
            {operationalStatus.label}
          </span>
        </span>

        <a
          className={styles.kbd}
          href={PI_DEV_OPS_BUILDS_URL}
          target="_blank"
          rel="noreferrer"
          data-testid="builds-link"
          title="Opens the Pi-Dev-Ops builds view. It has its own login until the escorted link is authorised (Q6)."
        >
          <b>▶</b> builds
        </a>
        <CommandPaletteTrigger className={styles.kbd} />
      </header>

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
